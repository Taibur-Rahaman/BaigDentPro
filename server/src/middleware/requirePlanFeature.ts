import type { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from './auth.js';
import { maxBranchesAllowed } from '../services/planCatalog.js';

export type PlanFeatureKey = 'roleAccess' | 'branding' | 'branches' | 'reports' | 'prioritySupport';

/**
 * Gate SaaS capabilities defined on `Plan.features` (+ subscription JSON overrides).
 * - `branches`: async — allows creating another branch when under the plan branch cap.
 * - `reports` with value `advanced`: requires merged.reports === 'advanced'
 * - boolean keys: must be strictly true
 */
export function requirePlanFeature(feature: PlanFeatureKey) {
  if (feature === 'branches') {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const ctx = req.clinicSubscription;
      if (!ctx) {
        res.status(500).json({ success: false, error: 'Subscription context missing' });
        return;
      }
      const max = maxBranchesAllowed(ctx.mergedPlanFeatures);
      const count = await prisma.branch.count({ where: { clinicId: ctx.clinicId } });
      if (count >= max) {
        res.status(403).json({
          success: false,
          error: 'Your plan does not allow additional branches. Upgrade to Premium or Luxury.',
        });
        return;
      }
      next();
    };
  }

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const ctx = req.clinicSubscription;
    if (!ctx) {
      res.status(500).json({ success: false, error: 'Subscription context missing' });
      return;
    }
    const merged = ctx.mergedPlanFeatures;
    if (feature === 'reports') {
      if (merged.reports !== 'advanced') {
        res.status(403).json({ success: false, error: 'Advanced reports are not included in your plan' });
        return;
      }
      next();
      return;
    }
    const v = merged[feature];
    if (v !== true) {
      res.status(403).json({ success: false, error: `Plan feature "${feature}" is not enabled` });
      return;
    }
    next();
  };
}
