import { ApiHttpError } from '@/lib/apiErrors';
import { isRecord, numField } from '@/lib/core/domainShared';
import { patientPortalApiRequest } from '@/lib/core/corePatientPortalHttp';
import type { PatientPortalInvoiceRow, PatientPortalPaymentLinkResult } from '@/types/patientPortal';

function parseInvoice(x: unknown): PatientPortalInvoiceRow | null {
  if (!isRecord(x) || typeof x.id !== 'string' || typeof x.invoiceNo !== 'string') return null;
  const dateVal = x.date;
  const date =
    typeof dateVal === 'string'
      ? dateVal
      : dateVal instanceof Date
        ? dateVal.toISOString()
        : '';
  const dueDateVal = x.dueDate;
  const dueDate =
    dueDateVal === null
      ? null
      : typeof dueDateVal === 'string'
        ? dueDateVal
        : dueDateVal instanceof Date
          ? dueDateVal.toISOString()
          : null;
  return {
    id: x.id,
    invoiceNo: x.invoiceNo,
    date,
    dueDate,
    status: typeof x.status === 'string' ? x.status : '',
    total: numField(x, 'total'),
    paid: numField(x, 'paid'),
    due: numField(x, 'due'),
  };
}

export async function corePatientPortalInvoices(): Promise<{ invoices: PatientPortalInvoiceRow[] }> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/billing/invoices', { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.invoices)) {
    throw new ApiHttpError('Invalid invoices response', 500, '');
  }
  const invoices = raw.invoices.map(parseInvoice).filter((r): r is PatientPortalInvoiceRow => r !== null);
  return { invoices };
}

export async function corePatientPortalPaymentLink(invoiceId: string): Promise<PatientPortalPaymentLinkResult> {
  const enc = encodeURIComponent(invoiceId);
  const raw = await patientPortalApiRequest<unknown>(`/patient-portal/billing/invoices/${enc}/payment-link`, {
    method: 'POST',
    body: {},
  });
  if (!isRecord(raw) || typeof raw.invoiceId !== 'string') {
    throw new ApiHttpError('Invalid payment link response', 500, '');
  }
  return {
    paymentLink: raw.paymentLink === null ? null : typeof raw.paymentLink === 'string' ? raw.paymentLink : null,
    status: typeof raw.status === 'string' ? raw.status : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    invoiceId: raw.invoiceId,
    balanceDue: numField(raw, 'balanceDue'),
  };
}
