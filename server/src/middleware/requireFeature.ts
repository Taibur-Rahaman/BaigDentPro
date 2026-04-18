import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { checkFeature, type FeatureName } from '../utils/featureFlags.js';

export function requireFeature(feature: FeatureName) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const ctx = req.clinicSubscription;
    if (!ctx) {
      res.status(500).json({ success: false, error: 'Subscription context missing' });
      return;
    }
    if (!checkFeature(ctx.effectivePlan, ctx.features, feature)) {
      res.status(403).json({ success: false, error: 'Feature not available in your plan' });
      return;
    }
    next();
  };
}
