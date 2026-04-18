/** Stored on `Payment.paymentSource` — server-normalized; amounts trust only after verification rules. */
export type InvoicePaymentSource = 'CASH' | 'STRIPE' | 'BKASH' | 'NAGAD';

/**
 * Map request body / legacy values to canonical sources.
 * STRIPE path still requires Stripe verification (server retrieve and/or webhook) before VERIFIED.
 */
export function normalizeInvoicePaymentSource(raw: unknown): InvoicePaymentSource {
  const u = String(raw ?? 'CASH')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (u === 'STRIPE' || u === 'STRIPE_VERIFIED' || u === 'CARD') return 'STRIPE';
  if (u === 'BKASH' || u === 'B_KASH' || u === 'B_KASH_ROCKET') return 'BKASH';
  if (u === 'NAGAD' || u === 'NAGAD_MFS') return 'NAGAD';
  if (u === 'CASH_INTERNAL' || u === 'CASH' || u === '' || u === 'INTERNAL') return 'CASH';
  return 'CASH';
}
