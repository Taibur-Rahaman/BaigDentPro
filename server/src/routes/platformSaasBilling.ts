/**
 * @domain PLATFORM_SAAS_FINANCE
 * File: platformSaasBilling.ts — clinic subscription status / checkout hints.
 * HTTP mount remains `/api/billing/*` (see createApp). NOT patient AR (`/api/invoices`).
 */
import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/clinicSubscription.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { createCheckoutSessionPlaceholder, syncSubscriptionState } from '../services/platformSaasBillingHints.js';

const router = Router();

/** Routing hint — subscriptions settle via `POST /api/payment/manual/initiate` (WhatsApp). */
router.post(
  '/checkout',
  requireAuth,
  asyncRoute('billing.checkout', async (req: AuthRequest, res: Response) => {
    const body = req.body as { planCode?: string };
    const hint = await createCheckoutSessionPlaceholder({ planCode: body.planCode });
    res.json({ success: true, data: hint });
  })
);

router.post(
  '/create-checkout-session',
  requireAuth,
  asyncRoute('billing.create-checkout-session', async (req: AuthRequest, res: Response) => {
    const body = req.body as { priceId?: string; plan?: string };
    const hint = await createCheckoutSessionPlaceholder({ planCode: body.plan });
    res.status(200).json({
      success: true,
      ...hint,
      requestedPlan: typeof body.plan === 'string' ? body.plan : undefined,
    });
  })
);

/** Deprecated — SaaS billing uses manual WhatsApp settlement only. */
router.post('/webhook', asyncRoute('billing.webhook', async (_req, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Deprecated. Subscription payments are manual WhatsApp — no webhook.',
  });
}));

async function sendSubscriptionPayload(req: AuthRequest, res: Response) {
  const ctx = req.clinicSubscription!;
  const sub = await prisma.subscription.findUnique({
    where: { clinicId: ctx.clinicId },
    select: { id: true, plan: true, status: true, features: true, expiresAt: true, updatedAt: true },
  });
  const manualMirror = await syncSubscriptionState(ctx.clinicId);
  res.json({
    success: true,
    data: {
      clinicId: ctx.clinicId,
      plan: ctx.effectivePlan,
      status: ctx.status,
      features: sub?.features ?? {},
      expiresAt: sub?.expiresAt ?? null,
      updatedAt: sub?.updatedAt ?? null,
      manualMirror,
    },
  });
}

/** Current subscription row from DB (source of truth). */
router.get(
  '/status',
  requireActiveSubscription,
  asyncRoute('billing.status', async (req: AuthRequest, res: Response) => {
    await sendSubscriptionPayload(req, res);
  })
);

/** Alias for enterprise clients */
router.get(
  '/subscription',
  requireActiveSubscription,
  asyncRoute('billing.subscription', async (req: AuthRequest, res: Response) => {
    await sendSubscriptionPayload(req, res);
  })
);

export default router;
