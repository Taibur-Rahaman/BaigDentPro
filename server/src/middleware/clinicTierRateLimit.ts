import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import type { AuthRequest } from './auth.js';
import { recordRateSpikeFraud } from '../services/fraudAlertService.js';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Per spec: PLATINUM 1000, PREMIUM 3000, LUXURY 6000 req/min (authenticated clinic scope). */
function maxPerMinuteForPlan(plan: string): number {
  const p = (plan || 'FREE').toUpperCase();
  if (p === 'PLATINUM') return 1000;
  if (p === 'PREMIUM') return 3000;
  if (p === 'LUXURY') return 6000;
  if (p === 'ENTERPRISE') return 6000;
  return Math.max(60, parseInt(process.env.API_CLINIC_RATE_DEFAULT_MAX ?? '200', 10) || 200);
}

function bucketKey(req: AuthRequest): string {
  const clinicId = req.effectiveClinicId ?? req.user?.clinicId;
  if (clinicId) return `clinic:${clinicId}`;
  return `ip:${(req as Request).ip || 'unknown'}`;
}

function currentPlan(req: AuthRequest): string {
  if (req.clinicSubscription?.effectivePlan) return req.clinicSubscription.effectivePlan;
  if (typeof req.jwtPlan === 'string' && req.jwtPlan.trim()) return req.jwtPlan.trim();
  return 'FREE';
}

/**
 * Sliding-ish fixed window per clinic (or IP fallback). Run after `authenticate` and ideally
 * after `requireActiveSubscription` so `req.clinicSubscription` is populated.
 */
export function clinicTierRateLimiter() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const a = req as AuthRequest;
    if (!a.user?.id) {
      next();
      return;
    }
    const plan = currentPlan(a);
    const max = maxPerMinuteForPlan(plan);
    const key = bucketKey(a);
    const now = Date.now();
    const windowMs = 60_000;
    let b = buckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      const clinicId = a.effectiveClinicId ?? a.user?.clinicId;
      if (clinicId) void recordRateSpikeFraud(clinicId, (req as Request).ip || 'unknown');
      const retrySec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({ error: 'Too many requests for this workspace' });
      return;
    }
    next();
  };
}
