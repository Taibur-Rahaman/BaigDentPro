import type { Prisma } from '@prisma/client';
import { writeAuditLog } from './auditLogService.js';

export type InvoiceReconcileAuditContext = {
  userId: string;
  clinicId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

/** Recompute `Invoice.paid`, `Invoice.due`, and `Invoice.status` from VERIFIED payments only (never trust stored balances). */
export async function reconcileInvoiceFromVerifiedPayments(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  audit?: InvoiceReconcileAuditContext | null
): Promise<{ paidVerified: number; due: number; status: string }> {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const st = String(invoice.status || '').toUpperCase();
  if (st === 'CANCELLED' || st === 'CANCELED') {
    const agg0 = await tx.payment.aggregate({
      where: { invoiceId, paymentStatus: 'VERIFIED' },
      _sum: { amount: true },
    });
    const paidVerified = Number(agg0._sum.amount ?? 0);
    return { paidVerified, due: Number(invoice.due), status: invoice.status };
  }

  const agg = await tx.payment.aggregate({
    where: { invoiceId, paymentStatus: 'VERIFIED' },
    _sum: { amount: true },
  });
  const paidVerified = Number(agg._sum.amount ?? 0);
  const total = Number(invoice.total);
  const due = Math.max(0, Math.round((total - paidVerified) * 100) / 100);

  let status: string;
  if (due <= 0.0001) {
    status = 'PAID';
  } else if (paidVerified > 0) {
    status = 'PARTIAL';
  } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
    status = 'OVERDUE';
  } else {
    status = 'PENDING';
  }

  const prevPaid = Number(invoice.paid);
  const prevDue = Number(invoice.due);
  const prevStatus = String(invoice.status ?? '');
  const changed =
    Math.abs(prevPaid - paidVerified) > 0.005 ||
    Math.abs(prevDue - due) > 0.005 ||
    prevStatus !== status;

  if (changed && audit) {
    void writeAuditLog({
      userId: audit.userId,
      clinicId: audit.clinicId,
      action: 'INVOICE_RECONCILIATION_FIX',
      entityType: 'Invoice',
      entityId: invoiceId,
      beforeSnapshot: { paid: prevPaid, due: prevDue, status: prevStatus },
      afterSnapshot: { paid: paidVerified, due, status },
      metadata: audit.metadata ?? undefined,
      ipAddress: audit.ipAddress ?? null,
      userAgent: audit.userAgent ?? null,
    });
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { paid: paidVerified, due, status },
  });

  return { paidVerified, due, status };
}

export function reconciliationStatusForPaymentStatus(paymentStatus: string): string {
  if (paymentStatus === 'VERIFIED') return 'VERIFIED';
  if (paymentStatus === 'REJECTED') return 'REJECTED';
  return 'RECORDED';
}
