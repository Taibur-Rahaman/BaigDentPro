import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { subscriptionUpgradeBodySchema, type SubscriptionUpgradeBody } from '../validation/schemas.js';
import { logActivity } from '../services/clinicActivityLogService.js';
import { blockImpersonationBilling } from '../middleware/blockImpersonationBilling.js';
import { applyVerifiedSubscriptionPayment } from '../services/subscriptionPaymentApply.js';

const router = Router();

function resolveTargetClinicId(req: AuthRequest, body: SubscriptionUpgradeBody): string | null {
  if (req.user!.role === 'SUPER_ADMIN') {
    return body.clinicId?.trim() || null;
  }
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId ?? null;
}

router.post(
  '/upgrade',
  requireRole('CLINIC_ADMIN', 'SUPER_ADMIN'),
  blockImpersonationBilling,
  validateBody(subscriptionUpgradeBodySchema),
  asyncRoute('subscription.upgrade', async (req: AuthRequest, res: Response) => {
    const body = req.body as SubscriptionUpgradeBody;
    const clinicId = resolveTargetClinicId(req, body);
    if (!clinicId) {
      res.status(400).json({ success: false, error: 'clinicId is required for platform administrators' });
      return;
    }

    const scoped = req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId;
    if (req.user!.role !== 'SUPER_ADMIN' && clinicId !== scoped) {
      res.status(403).json({ success: false, error: 'Cannot modify another clinic subscription' });
      return;
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, isActive: true },
    });
    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }
    if (!clinic.isActive) {
      res.status(403).json({ success: false, error: 'Clinic is disabled' });
      return;
    }

    if (req.user!.role !== 'SUPER_ADMIN') {
      const vp = body.verifiedPaymentId?.trim();
      if (!vp) {
        res.status(400).json({
          success: false,
          error: 'verifiedPaymentId is required. Complete Stripe checkout first; the webhook activates the plan.',
        });
        return;
      }
      const pay = await prisma.subscriptionPayment.findFirst({
        where: { id: vp, clinicId, status: 'SUCCESS' },
      });
      if (!pay) {
        res.status(403).json({ success: false, error: 'No successful payment found for this clinic' });
        return;
      }
      const applied = await applyVerifiedSubscriptionPayment(pay.id);
      if (!applied.ok) {
        res.status(400).json({ success: false, error: applied.error });
        return;
      }
      const sub = await prisma.subscription.findUnique({
        where: { clinicId },
        include: { planRef: true },
      });
      void logActivity({
        userId: req.user!.id,
        clinicId,
        action: 'SUBSCRIPTION_UPGRADED',
        entity: 'SUBSCRIPTION',
        entityId: sub?.id ?? clinicId,
        meta: { via: 'verified_payment', paymentId: vp },
        req,
      });
      res.json({
        success: true,
        data: {
          subscription: sub,
          deviceLimit: sub?.planRef?.deviceLimit ?? null,
        },
      });
      return;
    }

    const plan = body.planId
      ? await prisma.plan.findUnique({ where: { id: body.planId } })
      : await prisma.plan.findFirst({
          where: { name: { equals: body.planName!.trim(), mode: 'insensitive' } },
        });

    if (!plan) {
      res.status(404).json({ success: false, error: 'Plan not found' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + body.durationDays);

    const planCode = plan.name.toUpperCase();

    const sub = await prisma.subscription.upsert({
      where: { clinicId },
      create: {
        clinicId,
        planId: plan.id,
        plan: planCode,
        status: 'ACTIVE',
        startDate,
        endDate,
        expiresAt: endDate,
        autoRenew: body.autoRenew ?? true,
      },
      update: {
        planId: plan.id,
        plan: planCode,
        status: 'ACTIVE',
        startDate,
        endDate,
        expiresAt: endDate,
        ...(body.autoRenew !== undefined ? { autoRenew: body.autoRenew } : {}),
      },
      select: {
        id: true,
        clinicId: true,
        plan: true,
        planId: true,
        status: true,
        startDate: true,
        endDate: true,
        expiresAt: true,
        autoRenew: true,
      },
    });

    await prisma.clinic.update({
      where: { id: clinicId },
      data: { plan: planCode },
    });

    void logActivity({
      userId: req.user!.id,
      clinicId,
      action: 'SUBSCRIPTION_UPGRADED',
      entity: 'SUBSCRIPTION',
      entityId: sub.id,
      meta: { planId: plan.id, planName: plan.name, deviceLimit: plan.deviceLimit, via: 'super_admin' },
      req,
    });

    res.json({
      success: true,
      data: {
        subscription: sub,
        deviceLimit: plan.deviceLimit,
      },
    });
  })
);

export default router;
