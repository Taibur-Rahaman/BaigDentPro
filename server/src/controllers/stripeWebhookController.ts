import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { prismaBase } from '../db/prisma.js';
import { applyVerifiedSubscriptionPayment } from '../services/subscriptionPaymentApply.js';
import { reconcileInvoiceFromVerifiedPayments } from '../services/invoiceReconciliationService.js';
import { verifyStripePaymentIntentForInvoicePayment } from '../services/stripeInvoicePayment.js';
import { writeAuditLog } from '../services/auditLogService.js';

/**
 * Stripe webhook — must be mounted under `express.raw({ type: 'application/json' })`.
 */
export async function handleStripePaymentWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !key) {
    res.status(503).json({ error: 'Stripe webhook is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (typeof sig !== 'string' || !sig) {
    res.status(400).json({ error: 'Missing stripe-signature' });
    return;
  }

  const buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, secret);
  } catch (e) {
    console.warn('[stripe webhook] signature:', e instanceof Error ? e.message : e);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const paymentId =
        typeof pi.metadata?.baigdentpro_payment_id === 'string' ? pi.metadata.baigdentpro_payment_id.trim() : '';
      if (paymentId) {
        const pay = await prismaBase.subscriptionPayment.findFirst({
          where: { id: paymentId, status: 'PENDING' },
        });
        if (pay) {
          await prismaBase.subscriptionPayment.updateMany({
            where: { id: paymentId, status: 'PENDING' },
            data: { status: 'SUCCESS', externalRef: pi.id },
          });
          const applied = await applyVerifiedSubscriptionPayment(paymentId);
          if (!applied.ok) {
            console.warn('[stripe webhook] apply payment:', applied.error, paymentId);
          }
          await prismaBase.paymentEventLog
            .create({
              data: {
                clinicId: pay.clinicId,
                subscriptionPaymentId: paymentId,
                event: 'STRIPE_PAYMENT_INTENT_SUCCEEDED',
                payload: { paymentIntentId: pi.id } as object,
                verified: true,
              },
            })
            .catch(() => {});
        }
      }

      const pendingInvoicePayment = await prismaBase.payment.findFirst({
        where: { stripePaymentIntentId: pi.id, paymentStatus: 'PENDING', paymentSource: 'STRIPE' },
        include: { invoice: true },
      });
      if (pendingInvoicePayment?.invoice) {
        const inv = pendingInvoicePayment.invoice;
        const verified = await verifyStripePaymentIntentForInvoicePayment({
          stripePaymentIntentId: pi.id,
          invoiceId: inv.id,
          clinicId: inv.clinicId,
          expectedMajorAmount: Number(pendingInvoicePayment.amount),
          currency: 'bdt',
        });
        if (verified.ok) {
          await prismaBase.$transaction(async (tx) => {
            const updated = await tx.payment.updateMany({
              where: { id: pendingInvoicePayment.id, paymentStatus: 'PENDING' },
              data: {
                paymentStatus: 'VERIFIED',
                reconciliationStatus: 'VERIFIED',
                verifiedAt: new Date(),
              },
            });
            if (updated.count > 0) {
              await reconcileInvoiceFromVerifiedPayments(tx, inv.id, {
                userId: inv.userId,
                clinicId: inv.clinicId,
                metadata: { source: 'stripe_webhook' },
              });
              void writeAuditLog({
                userId: inv.userId,
                clinicId: inv.clinicId,
                action: 'PAYMENT_VERIFY',
                entityType: 'Payment',
                entityId: pendingInvoicePayment.id,
                metadata: { source: 'stripe_webhook', paymentIntentId: pi.id },
                ipAddress: null,
                userAgent: 'stripe-webhook',
              });
            }
          });
        }
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('[stripe webhook]', e);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
