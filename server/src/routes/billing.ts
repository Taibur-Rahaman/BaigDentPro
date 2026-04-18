import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/clinicSubscription.js';
import { asyncRoute } from '../utils/routeErrors.js';

const router = Router();

/** Stripe Checkout is not wired here — use `POST /api/payment/initiate` + `/api/payment/webhook/stripe`. */
router.post(
  '/create-checkout-session',
  asyncRoute('billing.create-checkout-session', async (req: AuthRequest, res: Response) => {
    const body = req.body as { priceId?: string; plan?: string };
    res.status(501).json({
      success: false,
      error: 'Use POST /api/payment/initiate with method STRIPE for subscription checkout.',
      requestedPlan: typeof body.plan === 'string' ? body.plan : undefined,
    });
  })
);

/** Deprecated: billing webhooks are not used. Configure `POST /api/payment/webhook/stripe` on Stripe instead. */
router.post('/webhook', asyncRoute('billing.webhook', async (_req, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Deprecated endpoint. Use POST /api/payment/webhook/stripe with a Stripe-signed payload.',
  });
}));

/** Current subscription row from DB (source of truth). */
router.get(
  '/status',
  requireActiveSubscription,
  asyncRoute('billing.status', async (req: AuthRequest, res: Response) => {
    const ctx = req.clinicSubscription!;
    const sub = await prisma.subscription.findUnique({
      where: { clinicId: ctx.clinicId },
      select: { id: true, plan: true, status: true, features: true, expiresAt: true, updatedAt: true },
    });
    res.json({
      success: true,
      data: {
        clinicId: ctx.clinicId,
        plan: ctx.effectivePlan,
        status: ctx.status,
        features: sub?.features ?? {},
        expiresAt: sub?.expiresAt ?? null,
        updatedAt: sub?.updatedAt ?? null,
      },
    });
  })
);

export default router;
