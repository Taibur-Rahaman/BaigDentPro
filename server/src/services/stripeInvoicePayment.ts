import Stripe from 'stripe';

/**
 * Confirms a Stripe PaymentIntent was completed server-side for a clinic invoice payment.
 * Requires metadata set when the intent was created (see payment intent helper or client integration).
 */
export async function verifyStripePaymentIntentForInvoicePayment(opts: {
  stripePaymentIntentId: string;
  invoiceId: string;
  clinicId: string;
  /** Expected major currency amount (e.g. BDT) — compared to PI amount in smallest units. */
  expectedMajorAmount: number;
  currency: string;
}): Promise<{ ok: true; paymentIntentId: string } | { ok: false; error: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return { ok: false, error: 'Stripe is not configured on the server' };
  }
  const stripe = new Stripe(key);
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(opts.stripePaymentIntentId);
  } catch {
    return { ok: false, error: 'Could not retrieve Stripe PaymentIntent' };
  }

  if (pi.status !== 'succeeded') {
    return { ok: false, error: `PaymentIntent is not succeeded (status=${pi.status})` };
  }

  const meta = (pi.metadata || {}) as Record<string, string>;
  if (String(meta.baigdentpro_invoice_id || '').trim() !== opts.invoiceId) {
    return { ok: false, error: 'PaymentIntent metadata does not match this invoice' };
  }
  if (String(meta.clinic_id || '').trim() !== opts.clinicId) {
    return { ok: false, error: 'PaymentIntent metadata does not match this clinic' };
  }

  const cur = (opts.currency || 'bdt').toLowerCase();
  if (pi.currency.toLowerCase() !== cur) {
    return { ok: false, error: 'PaymentIntent currency does not match invoice currency' };
  }

  const expectedMinor = Math.round(opts.expectedMajorAmount * 100);
  if (!Number.isFinite(expectedMinor) || expectedMinor <= 0) {
    return { ok: false, error: 'Invalid expected payment amount' };
  }
  if (pi.amount !== expectedMinor) {
    return { ok: false, error: 'PaymentIntent amount does not match requested payment amount' };
  }

  return { ok: true, paymentIntentId: pi.id };
}
