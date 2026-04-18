import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

/**
 * Fail-safe after `requireActiveSubscription`: subscription clinic must match effective JWT scope.
 * Prevents accidental cross-clinic handlers if `clinicId` is omitted in a Prisma query later.
 */
export function requireSaaSClinicScopeAlignment(req: AuthRequest, res: Response, next: NextFunction): void {
  const expected = req.effectiveClinicId ?? req.user?.clinicId;
  const sub = req.clinicSubscription;
  if (!expected || !sub || sub.clinicId !== expected) {
    res.status(403).json({ success: false, error: 'Tenant scope mismatch' });
    return;
  }
  next();
}
