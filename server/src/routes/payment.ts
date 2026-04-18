import { Router } from 'express';
import type { Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { paymentInitiateBodySchema, type PaymentInitiateBody } from '../validation/schemas.js';
import { blockImpersonationBilling } from '../middleware/blockImpersonationBilling.js';

const router = Router();

router.use(requireRole('CLINIC_ADMIN', 'SUPER_ADMIN'));
router.use(blockImpersonationBilling);

function resolveClinicId(req: AuthRequest, bodyClinicId?: string): string | null {
  if (req.user!.role === 'SUPER_ADMIN') {
    return bodyClinicId?.trim() || null;
  }
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId ?? null;
}

router.post(
  '/initiate',
  validateBody(paymentInitiateBodySchema),
  asyncRoute('payment.initiate', async (req: AuthRequest, res: Response) => {
    const body = req.body as PaymentInitiateBody;
    const clinicId = resolveClinicId(req, body.clinicId);
    if (!clinicId) {
      res.status(400).json({ success: false, error: 'clinicId is required for platform administrators' });
      return;
    }
    const scoped = req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId;
    if (req.user!.role !== 'SUPER_ADMIN' && clinicId !== scoped) {
      res.status(403).json({ success: false, error: 'Cannot bill another clinic' });
      return;
    }

    if (body.method !== 'STRIPE') {
      res.status(501).json({
        success: false,
        error: 'Only STRIPE is supported for subscription checkout. bKash/Nagad integration is not enabled.',
      });
      return;
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeKey) {
      res.status(503).json({
        success: false,
        error: 'Stripe is not configured (set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET).',
      });
      return;
    }

    const planCode = body.planCode?.trim().toUpperCase() ?? null;
    if (!planCode) {
      res.status(400).json({ success: false, error: 'planCode is required for subscription payments' });
      return;
    }

    const row = await prisma.subscriptionPayment.create({
      data: {
        clinicId,
        amount: body.amount,
        method: 'STRIPE',
        status: 'PENDING',
        planCode,
        metadata: { source: 'payment_initiate' },
      },
      select: { id: true, clinicId: true, amount: true, method: true, status: true, planCode: true, createdAt: true },
    });

    const stripe = new Stripe(stripeKey);
    let clientSecret: string | undefined;
    try {
      const intent = await stripe.paymentIntents.create({
        amount: body.amount,
        currency: 'bdt',
        automatic_payment_methods: { enabled: true },
        metadata: {
          baigdentpro_payment_id: row.id,
          clinic_id: clinicId,
          plan_code: planCode,
        },
      });
      clientSecret = intent.client_secret ?? undefined;
      await prisma.subscriptionPayment.update({
        where: { id: row.id },
        data: { externalRef: intent.id },
      });
    } catch (e) {
      console.error('[payment.initiate]', e);
      await prisma.subscriptionPayment.update({
        where: { id: row.id },
        data: { status: 'FAILED', metadata: { error: e instanceof Error ? e.message : String(e) } },
      });
      res.status(502).json({ success: false, error: 'Could not create Stripe payment intent' });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        payment: row,
        stripeClientSecret: clientSecret,
      },
    });
  })
);

export default router;
