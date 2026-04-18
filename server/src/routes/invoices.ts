import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { generateInvoicePDF } from '../services/pdf.js';
import { sendEmail } from '../services/email.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';
import {
  blockTenantFromEmr,
  requireInvoicePaymentVerificationAccess,
  requireInvoicesEmrAccess,
} from '../middleware/clinicalRbac.js';
import { writeAuditLog } from '../services/auditLogService.js';
import {
  reconcileInvoiceFromVerifiedPayments,
  reconciliationStatusForPaymentStatus,
} from '../services/invoiceReconciliationService.js';
import {
  recordAbnormalInvoiceEdit,
  recordMfsPaymentVerifyRejection,
  recordVerifiedPaymentDayVolume,
} from '../services/fraudAlertService.js';
import { normalizeInvoicePaymentSource } from '../utils/invoicePaymentSource.js';
import { assertPaymentSourceAllowedForRegion, normalizeClinicRegion } from '../utils/clinicRegion.js';

const router = Router();

router.use(blockTenantFromEmr);
router.use(requireInvoicesEmrAccess);

const clinicInvoiceScope = (req: AuthRequest) => ({ clinicId: resolveBusinessClinicId(req) });

/** Only cancellation may be set from the client; PAID/PARTIAL/etc. are derived from VERIFIED payments. */
function allowedInvoiceStatusFromClient(status: unknown): string | undefined {
  const s = String(status ?? '').trim().toUpperCase();
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  return undefined;
}

async function generateInvoiceNo(req: AuthRequest): Promise<string> {
  const clinicId = resolveBusinessClinicId(req);
  const date = new Date();
  const prefix = `INV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.invoice.count({
    where: { clinicId, invoiceNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { patientId, status, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { ...clinicInvoiceScope(req) };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { date: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          items: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const scope = clinicInvoiceScope(req);

    const [totalRevenue, monthlyRevenue, pendingDue, paidThisMonth] = await Promise.all([
      prisma.invoice.aggregate({
        where: { ...scope, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...scope,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { total: true, paid: true },
      }),
      prisma.invoice.aggregate({
        where: { ...scope, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        _sum: { due: true },
      }),
      prisma.payment.aggregate({
        where: {
          invoice: scope,
          paymentStatus: 'VERIFIED',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      pendingDue: pendingDue._sum.due || 0,
      paidThisMonth: paidThisMonth._sum.amount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...clinicInvoiceScope(req) },
      include: {
        patient: true,
        items: true,
        payments: { orderBy: { date: 'desc' } },
        user: {
          select: { name: true, clinicName: true, clinicAddress: true, clinicPhone: true, clinicEmail: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { patientId, dueDate, items, discount = 0, tax = 0, notes } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: resolveBusinessClinicId(req) },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const invoiceNo = await generateInvoiceNo(req);
    const clinicId = resolveBusinessClinicId(req);

    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal - parseFloat(discount) + parseFloat(tax);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        patientId,
        userId: req.user!.id,
        clinicId,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        discount: parseFloat(discount),
        tax: parseFloat(tax),
        total,
        due: total,
        notes,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.unitPrice),
            total: (item.quantity || 1) * parseFloat(item.unitPrice),
          })),
        },
      },
      include: { patient: true, items: true },
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { dueDate, items, discount = 0, tax = 0, notes, status } = req.body;
    const cid = resolveBusinessClinicId(req);
    const clientInvoiceStatus = allowedInvoiceStatusFromClient(status);

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, clinicId: cid },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (items) {
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
      const total =
        Number(subtotal) - parseFloat(discount || String(existing.discount)) + parseFloat(tax || String(existing.tax));
      const prevTotal = Number(existing.total);
      if (prevTotal >= 1 && Math.abs(total - prevTotal) / prevTotal >= 0.5) {
        void recordAbnormalInvoiceEdit({
          clinicId: cid,
          userId: req.user!.id,
          invoiceId: existing.id,
          previousTotal: prevTotal,
          newTotal: total,
        });
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });

      const subtotal =
        items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || existing.subtotal;
      const total =
        Number(subtotal) -
        parseFloat(discount !== undefined ? String(discount) : String(existing.discount)) +
        parseFloat(tax !== undefined ? String(tax) : String(existing.tax));

      await tx.invoice.update({
        where: { id: req.params.id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : undefined,
          subtotal: items ? subtotal : undefined,
          discount: discount !== undefined ? parseFloat(discount) : undefined,
          tax: tax !== undefined ? parseFloat(tax) : undefined,
          total: items ? total : undefined,
          notes,
          ...(clientInvoiceStatus !== undefined ? { status: clientInvoiceStatus } : {}),
          items: items
            ? {
                create: items.map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity || 1,
                  unitPrice: parseFloat(item.unitPrice),
                  total: (item.quantity || 1) * parseFloat(item.unitPrice),
                })),
              }
            : undefined,
        },
      });

      await reconcileInvoiceFromVerifiedPayments(tx, req.params.id, {
        userId: req.user!.id,
        clinicId: cid,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
        metadata: { source: 'invoice_put' },
      });

      return tx.invoice.findFirst({
        where: { id: req.params.id, clinicId: cid },
        include: { patient: true, items: true, payments: true },
      });
    });

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...clinicInvoiceScope(req) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function staffRole(req: AuthRequest): string {
  return (req.user?.role || '').trim();
}

router.post(
  '/:id/payments/:paymentId/verify',
  requireInvoicePaymentVerificationAccess,
  async (req: AuthRequest, res) => {
    try {
      const decision = String((req.body as { decision?: string }).decision || '')
        .trim()
        .toUpperCase();
      const cid = resolveBusinessClinicId(req);
      const paymentId = req.params.paymentId;

      if (decision !== 'VERIFY' && decision !== 'REJECT') {
        res.status(400).json({ error: 'decision must be VERIFY or REJECT' });
        return;
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findFirst({
            where: {
              id: paymentId,
              invoiceId: req.params.id,
              invoice: { clinicId: cid },
            },
          });
          if (!payment) return { error: 'NOT_FOUND' as const };
          if (payment.paymentSource !== 'BKASH' && payment.paymentSource !== 'NAGAD') {
            return { error: 'NOT_APPLICABLE' as const };
          }
          if (payment.paymentStatus !== 'PENDING') {
            return { error: 'NOT_PENDING' as const };
          }

          if (decision === 'REJECT') {
            await tx.payment.update({
              where: { id: paymentId },
              data: {
                paymentStatus: 'REJECTED',
                reconciliationStatus: reconciliationStatusForPaymentStatus('REJECTED'),
                verifiedByUserId: req.user!.id,
                verifiedAt: new Date(),
              },
            });
            await reconcileInvoiceFromVerifiedPayments(tx, req.params.id, {
              userId: req.user!.id,
              clinicId: cid,
              ipAddress: req.ip,
              userAgent: req.get('user-agent') ?? null,
              metadata: { source: 'mfs_payment_verify', decision: 'REJECT' },
            });
            return { ok: true as const };
          }

          await tx.payment.update({
            where: { id: paymentId },
            data: {
              paymentStatus: 'VERIFIED',
              reconciliationStatus: reconciliationStatusForPaymentStatus('VERIFIED'),
              verifiedByUserId: req.user!.id,
              verifiedAt: new Date(),
            },
          });
          await reconcileInvoiceFromVerifiedPayments(tx, req.params.id, {
            userId: req.user!.id,
            clinicId: cid,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
            metadata: { source: 'mfs_payment_verify', decision: 'VERIFY' },
          });
          return { ok: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if ('error' in result) {
        if (result.error === 'NOT_FOUND') {
          res.status(404).json({ error: 'Payment not found' });
          return;
        }
        if (result.error === 'NOT_APPLICABLE') {
          res.status(400).json({ error: 'Verification applies only to bKash or Nagad pending payments' });
          return;
        }
        if (result.error === 'NOT_PENDING') {
          res.status(409).json({ error: 'Payment is not pending verification' });
          return;
        }
      }

      if (decision === 'REJECT') {
        void recordMfsPaymentVerifyRejection({
          clinicId: cid,
          verifierUserId: req.user!.id,
          paymentId,
        });
      }

      void writeAuditLog({
        userId: req.user!.id,
        clinicId: cid,
        action: decision === 'VERIFY' ? 'PAYMENT_VERIFY' : 'PAYMENT_REJECT',
        entityType: 'Payment',
        entityId: paymentId,
        metadata: { invoiceId: req.params.id, decision },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      });

      const refreshed = await prisma.payment.findFirst({
        where: { id: paymentId, invoice: { clinicId: cid } },
      });
      res.json(refreshed);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

router.post('/:id/payments', async (req: AuthRequest, res) => {
  try {
    const {
      amount,
      method = 'CASH',
      reference,
      notes,
      paymentSource = 'CASH',
      stripePaymentIntentId,
      transactionRef: bodyTransactionRef,
    } = req.body as {
      amount: unknown;
      method?: string;
      reference?: string;
      notes?: string;
      paymentSource?: string;
      stripePaymentIntentId?: string;
      transactionRef?: string;
    };

    const cid = resolveBusinessClinicId(req);
    const clinic = await prisma.clinic.findUnique({
      where: { id: cid },
      select: { region: true },
    });
    const region = normalizeClinicRegion(clinic?.region);

    const normalizedSource = normalizeInvoicePaymentSource(paymentSource);
    const regionOk = assertPaymentSourceAllowedForRegion(normalizedSource, region);
    if (!regionOk.ok) {
      res.status(400).json({ error: regionOk.error });
      return;
    }

    if (staffRole(req) === 'RECEPTIONIST' && normalizedSource !== 'CASH') {
      void writeAuditLog({
        userId: req.user!.id,
        clinicId: cid,
        action: 'RBAC_DENY',
        entityType: 'Payment',
        metadata: { reason: 'receptionist_non_cash_payment', paymentSource: normalizedSource },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(403).json({ error: 'Receptionists may record CASH payments only' });
      return;
    }

    const paymentAmount = parseFloat(String(amount));
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({ error: 'Invalid payment amount' });
      return;
    }

    const txRefRaw =
      typeof bodyTransactionRef === 'string' && bodyTransactionRef.trim()
        ? bodyTransactionRef.trim()
        : typeof reference === 'string' && reference.trim()
          ? reference.trim()
          : '';

    if (normalizedSource === 'BKASH' || normalizedSource === 'NAGAD') {
      if (!txRefRaw) {
        res.status(400).json({ error: 'transactionRef is required for bKash and Nagad payments' });
        return;
      }
    }

    if (normalizedSource === 'STRIPE') {
      const pi = typeof stripePaymentIntentId === 'string' ? stripePaymentIntentId.trim() : '';
      if (!pi) {
        res.status(400).json({ error: 'stripePaymentIntentId is required for STRIPE payments' });
        return;
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({
          where: { id: req.params.id, clinicId: cid },
        });

        if (!invoice) {
          return { error: 'NOT_FOUND' as const };
        }

        if (normalizedSource === 'CASH') {
          const payment = await tx.payment.create({
            data: {
              invoiceId: req.params.id,
              amount: paymentAmount,
              method,
              reference: reference ?? null,
              notes,
              paymentSource: 'CASH',
              paymentStatus: 'VERIFIED',
              reconciliationStatus: reconciliationStatusForPaymentStatus('VERIFIED'),
              transactionRef: txRefRaw || null,
              verifiedAt: new Date(),
              verifiedByUserId: req.user!.id,
            },
          });
          await reconcileInvoiceFromVerifiedPayments(tx, invoice.id, {
            userId: req.user!.id,
            clinicId: cid,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
            metadata: { source: 'cash_payment' },
          });
          return { payment };
        }

        if (normalizedSource === 'BKASH' || normalizedSource === 'NAGAD') {
          const payment = await tx.payment.create({
            data: {
              invoiceId: req.params.id,
              amount: paymentAmount,
              method: method || normalizedSource,
              reference: reference ?? null,
              notes,
              paymentSource: normalizedSource,
              paymentStatus: 'PENDING',
              reconciliationStatus: reconciliationStatusForPaymentStatus('PENDING'),
              transactionRef: txRefRaw,
            },
          });
          return { payment };
        }

        const piStr = String(stripePaymentIntentId).trim();
        const Stripe = (await import('stripe')).default;
        const key = process.env.STRIPE_SECRET_KEY?.trim();
        if (!key) {
          return { error: 'STRIPE_UNCONFIGURED' as const };
        }
        const stripe = new Stripe(key);
        let intent: import('stripe').Stripe.PaymentIntent;
        try {
          intent = await stripe.paymentIntents.retrieve(piStr);
        } catch {
          return { error: 'STRIPE_REJECTED' as const, message: 'Could not retrieve Stripe PaymentIntent' };
        }
        const meta = (intent.metadata || {}) as Record<string, string>;
        if (String(meta.baigdentpro_invoice_id || '').trim() !== invoice.id) {
          return {
            error: 'STRIPE_REJECTED' as const,
            message: 'PaymentIntent metadata does not match this invoice',
          };
        }
        if (String(meta.clinic_id || '').trim() !== cid) {
          return { error: 'STRIPE_REJECTED' as const, message: 'PaymentIntent metadata does not match this clinic' };
        }
        const expectedMinor = Math.round(paymentAmount * 100);
        if (!Number.isFinite(expectedMinor) || expectedMinor <= 0 || intent.amount !== expectedMinor) {
          return { error: 'STRIPE_REJECTED' as const, message: 'PaymentIntent amount does not match requested payment amount' };
        }
        if (intent.currency.toLowerCase() !== 'bdt') {
          return { error: 'STRIPE_REJECTED' as const, message: 'PaymentIntent currency does not match invoice currency' };
        }
        const dup = await tx.payment.findFirst({ where: { stripePaymentIntentId: intent.id } });
        if (dup) {
          return { error: 'DUPLICATE_PI' as const };
        }
        const payment = await tx.payment.create({
          data: {
            invoiceId: req.params.id,
            amount: paymentAmount,
            method,
            reference: reference ?? null,
            notes,
            paymentSource: 'STRIPE',
            paymentStatus: 'PENDING',
            reconciliationStatus: reconciliationStatusForPaymentStatus('PENDING'),
            stripePaymentIntentId: intent.id,
          },
        });
        return { payment };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      if (result.error === 'STRIPE_REJECTED') {
        res.status(400).json({ error: 'message' in result ? result.message : 'Stripe verification failed' });
        return;
      }
      if (result.error === 'DUPLICATE_PI') {
        res.status(409).json({ error: 'This Stripe payment was already applied' });
        return;
      }
      if (result.error === 'STRIPE_UNCONFIGURED') {
        res.status(503).json({ error: 'Stripe is not configured on the server' });
        return;
      }
    }

    const payment = 'payment' in result ? result.payment : null;
    if (!payment) {
      res.status(500).json({ error: 'Payment failed' });
      return;
    }

    void writeAuditLog({
      userId: req.user!.id,
      clinicId: cid,
      action: 'PAYMENT_CREATE',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: {
        invoiceId: req.params.id,
        amount: paymentAmount,
        paymentSource: payment.paymentSource,
        paymentStatus: payment.paymentStatus,
        reconciliationStatus: payment.reconciliationStatus,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    if (payment.paymentStatus === 'VERIFIED') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const sumAgg = await prisma.payment.aggregate({
        where: {
          paymentStatus: 'VERIFIED',
          date: { gte: start, lt: end },
          invoice: { clinicId: cid },
        },
        _sum: { amount: true },
      });
      void recordVerifiedPaymentDayVolume({
        clinicId: cid,
        dayTotalVerified: Number(sumAgg._sum.amount) || 0,
      });
    }

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pdf', async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...clinicInvoiceScope(req) },
      include: {
        patient: true,
        items: true,
        payments: true,
        user: {
          select: { name: true, clinicName: true, clinicAddress: true, clinicPhone: true, clinicEmail: true, clinicLogo: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNo}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-email', async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...clinicInvoiceScope(req) },
      include: { patient: true, items: true, user: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.patient.email) {
      return res.status(400).json({ error: 'Patient email not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    await sendEmail({
      to: invoice.patient.email,
      subject: `Invoice ${invoice.invoiceNo} from ${invoice.user.clinicName || invoice.user.name}`,
      html: `
        <h2>Dear ${invoice.patient.name},</h2>
        <p>Please find your invoice attached.</p>
        <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
        <p><strong>Total:</strong> ৳${invoice.total}</p>
        <p><strong>Due:</strong> ৳${invoice.due}</p>
        <br>
        <p>Best regards,</p>
        <p>${invoice.user.name}</p>
        <p>${invoice.user.clinicName || ''}</p>
      `,
      attachments: [{
        filename: `invoice-${invoice.invoiceNo}.pdf`,
        content: pdfBuffer,
      }],
    });

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { sentViaEmail: true },
    });

    res.json({ message: 'Invoice sent via email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-whatsapp', async (req: AuthRequest, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...clinicInvoiceScope(req) },
      include: { patient: true, items: true, user: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.patient.phone) {
      return res.status(400).json({ error: 'Patient phone not found' });
    }

    const itemsList = invoice.items.map(item => 
      `• ${item.description}: ৳${item.total}`
    ).join('\n');

    const message = `
*Invoice from ${invoice.user.clinicName || invoice.user.name}*

Invoice No: ${invoice.invoiceNo}
Date: ${invoice.date.toLocaleDateString()}
Patient: ${invoice.patient.name}

*Items:*
${itemsList}

Subtotal: ৳${invoice.subtotal}
${Number(invoice.discount) > 0 ? `Discount: ৳${invoice.discount}\n` : ''}Total: ৳${invoice.total}
Paid: ৳${invoice.paid}
*Due: ৳${invoice.due}*

Thank you for choosing us!
    `.trim();

    await sendWhatsAppMessage(invoice.patient.phone, message);

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { sentViaWhatsapp: true },
    });

    res.json({ message: 'Invoice sent via WhatsApp' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
