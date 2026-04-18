import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

/**
 * Multi-tenant firewall: clinic scope in the JWT must match the user's home clinic,
 * unless the caller is a SUPER_ADMIN with an explicit impersonation session.
 * Run after `authenticate` (and before tenant SaaS handlers that trust `effectiveClinicId`).
 */
export function requireTenantIsolation(req: AuthRequest, res: Response, next: NextFunction): void {
  const u = req.user;
  if (!u?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const effective = req.effectiveClinicId ?? u.clinicId;
  if (!effective) {
    res.status(403).json({ success: false, error: 'No tenant scope' });
    return;
  }
  if (effective !== u.clinicId) {
    if (u.role !== 'SUPER_ADMIN' || req.impersonating !== true) {
      res.status(403).json({ success: false, error: 'Tenant isolation violation' });
      return;
    }
  }
  next();
}
