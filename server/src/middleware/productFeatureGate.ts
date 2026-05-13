import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import type { ProductFeatureKey } from '../services/productFeatures.js';

function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Same exemptions as subscription middleware — routes without subscription context skip product gates. */
const EXEMPT_PREFIXES: readonly string[] = [
  '/api/auth',
  '/api/health',
  '/api/branding',
  '/api/admin',
  '/api/super-admin',
  '/api/shop',
  '/api/invite/preview',
  '/api/invite/accept',
  '/api/billing/webhook',
  '/api/payment/webhook',
  '/api/patient-portal',
  '/api/billing',
  '/api/payment/manual',
  '/api/subscription',
  '/api/invite',
  '/api/db',
];

function exempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((p) => matchesPrefix(path, p));
}

/** Longest-prefix wins — first matching rule applies. */
const RULES: readonly { prefix: string; feature: ProductFeatureKey }[] = [
  { prefix: '/api/branches', feature: 'multi_branch' },
  { prefix: '/api/lab', feature: 'lab_tracking' },
  { prefix: '/api/prescriptions', feature: 'digital_prescription' },
  { prefix: '/api/invoices', feature: 'billing' },
  { prefix: '/api/payment', feature: 'billing' },
  { prefix: '/api/platform-saas', feature: 'billing' },
  { prefix: '/api/dashboard', feature: 'patient_management' },
  { prefix: '/api/activity', feature: 'advanced_analytics' },
  { prefix: '/api/upload', feature: 'patient_management' },
  { prefix: '/api/patients', feature: 'patient_management' },
  { prefix: '/api/appointments', feature: 'patient_management' },
  { prefix: '/api/communication', feature: 'patient_management' },
  { prefix: '/api/clinic', feature: 'patient_management' },
  { prefix: '/api/settings', feature: 'patient_management' },
  { prefix: '/api/products', feature: 'shop_access' },
  { prefix: '/api/orders', feature: 'shop_access' },
];

export function requiredProductFeatureForPath(apiPath: string): ProductFeatureKey | null {
  const path = pathOnly(apiPath);
  let best: { prefix: string; feature: ProductFeatureKey } | null = null;
  for (const r of RULES) {
    if (matchesPrefix(path, r.prefix)) {
      if (!best || r.prefix.length > best.prefix.length) best = r;
    }
  }
  return best?.feature ?? null;
}

/**
 * After `requireActiveSubscription`, enforce DPMS feature flags for sensitive route prefixes.
 * SUPER_ADMIN bypasses (platform operations).
 */
export function businessApiProductFeatures(req: Request, res: Response, next: NextFunction): void {
  const path = pathOnly(req.originalUrl || '');
  if (!path.startsWith('/api/') || exempt(path)) {
    next();
    return;
  }

  const authReq = req as AuthRequest;
  if (!authReq.clinicSubscription?.productFeatures) {
    next();
    return;
  }

  if (authReq.user?.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  const feat = requiredProductFeatureForPath(path);
  if (!feat) {
    next();
    return;
  }

  const enabled = authReq.clinicSubscription.productFeatures[feat];
  if (!enabled) {
    res.status(402).json({
      success: false,
      error: 'FEATURE_DISABLED',
      feature: feat,
    });
    return;
  }

  next();
}
