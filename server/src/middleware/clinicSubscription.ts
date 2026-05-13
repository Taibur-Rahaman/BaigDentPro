import type { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from './auth.js';
import { effectivePlanName, mergePlanFeatures, resolveDeviceLimit, type SubscriptionWithPlan } from '../services/planCatalog.js';
import { resolveProductFeaturesForClinic, type ProductFeatureKey } from '../services/productFeatures.js';
import { computeEffectiveCapabilities } from '../security/capabilityEngine.js';

/**
 * Requires an authenticated user with a clinic that is active and has an ACTIVE subscription.
 * Uses `req.effectiveClinicId` when set (JWT scope, e.g. impersonation) — **DB subscription is source of truth**.
 * Sets `req.clinicSubscription` for downstream handlers (FACL, product limits, etc.).
 */
export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const clinicId = (req.businessClinicId ?? req.effectiveClinicId ?? req.user?.clinicId)?.trim();
    if (!clinicId) {
      res.status(403).json({ success: false, error: 'No clinic context for this account' });
      return;
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        subscription: {
          include: { planRef: true },
        },
      },
    });

    if (!clinic) {
      res.status(403).json({ success: false, error: 'Clinic not found' });
      return;
    }

    if (!clinic.isActive) {
      res.status(403).json({ success: false, error: 'Clinic is disabled' });
      return;
    }

    const sub = clinic.subscription as SubscriptionWithPlan | null;
    const status = (sub?.status ?? 'ACTIVE').toUpperCase();
    if (status === 'CANCELLED') {
      res.status(403).json({ success: false, error: 'Subscription is not active' });
      return;
    }
    if (status === 'EXPIRED') {
      res.status(403).json({ success: false, error: 'Subscription has expired' });
      return;
    }
    if (status !== 'ACTIVE' && status !== 'TRIAL') {
      res.status(403).json({ success: false, error: 'Subscription is not active' });
      return;
    }

    const ends = [sub?.endDate, sub?.expiresAt].filter(Boolean) as Date[];
    const earliestEnd = ends.length ? new Date(Math.min(...ends.map((d) => d.getTime()))) : null;
    if (earliestEnd && earliestEnd.getTime() < Date.now()) {
      res.status(403).json({ success: false, error: 'Subscription has expired' });
      return;
    }

    const effectivePlan = effectivePlanName(sub, clinic.plan);
    const mergedPlanFeatures = mergePlanFeatures(sub?.planRef?.features, sub?.features);
    const deviceLimit = await resolveDeviceLimit(sub);
    const productFeatures = (await resolveProductFeaturesForClinic(clinicId)) as Record<ProductFeatureKey, boolean>;

    const role = req.user?.role ?? '';
    const overrides = await prisma.clinicCapabilityOverride.findMany({
      where: { clinicId },
      select: { capabilityKey: true, grant: true },
    });
    req.effectiveCapabilities = computeEffectiveCapabilities(role, productFeatures, overrides);

    req.clinicSubscription = {
      clinicId,
      effectivePlan,
      status,
      features: sub?.features ?? {},
      expiresAt: sub?.expiresAt ?? sub?.endDate ?? null,
      mergedPlanFeatures,
      deviceLimit,
      planId: sub?.planId ?? null,
      productFeatures,
    };
    next();
  } catch (e) {
    console.error('[requireActiveSubscription]', e);
    res.status(500).json({ success: false, error: 'Could not verify subscription' });
  }
}
