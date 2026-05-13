/**
 * @domain PLATFORM_SAAS_FINANCE
 * Clinic subscription / WhatsApp manual settlement — not patient AR (invoices).
 */
import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord } from '@/lib/core/domainShared';

export type CoreApiManualPaymentInitiateResult = {
  whatsappUrl: string;
  paymentId: string;
  paymentMethod: string;
};

/** POST /api/payment/manual/initiate — SaaS plan payment via WhatsApp flow. */
export async function coreApiManualPaymentInitiate(body: {
  planCode: string;
  clinicId?: string;
  amountMinor?: number;
}): Promise<CoreApiManualPaymentInitiateResult> {
  const raw = await coreApiRequest<unknown>('/payment/manual/initiate', { method: 'POST', body });
  if (!isRecord(raw) || raw.success !== true) {
    throw new ApiHttpError('Invalid payment initiate response', 500, '');
  }
  const data = raw.data;
  if (!isRecord(data)) {
    throw new ApiHttpError('Invalid payment initiate response', 500, '');
  }
  const whatsappUrl = typeof data.whatsappUrl === 'string' ? data.whatsappUrl.trim() : '';
  const payment = data.payment;
  const pid = isRecord(payment) && typeof payment.id === 'string' ? payment.id : null;
  const paymentMethod = typeof data.paymentMethod === 'string' ? data.paymentMethod : 'MANUAL_WHATSAPP';
  if (!whatsappUrl || !pid) {
    throw new ApiHttpError('Invalid payment initiate response', 500, '');
  }
  return { whatsappUrl, paymentId: pid, paymentMethod };
}
