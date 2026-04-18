import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { writeAuditLog } from '../services/auditLogService.js';

/**
 * Ensures every business request has a resolvable clinic scope and attaches `req.businessClinicId`.
 * Run only after `authenticate` has populated `req.user`.
 */
export function requireClinicScope(req: AuthRequest, res: Response, next: NextFunction): void {
  const u = req.user;
  if (!u?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const home = u.clinicId?.trim() || '';
  if (!home) {
    void writeAuditLog({
      userId: u.id,
      clinicId: null,
      action: 'INVALID_CLINIC_ACCESS',
      entityType: 'AUTH',
      metadata: { reason: 'missing_home_clinic' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(403).json({ success: false, error: 'Account is missing clinic assignment' });
    return;
  }

  const effective = (req.effectiveClinicId ?? home).trim();
  if (effective !== home) {
    if (u.role !== 'SUPER_ADMIN' || req.impersonating !== true) {
      void writeAuditLog({
        userId: u.id,
        clinicId: home,
        action: 'INVALID_CLINIC_ACCESS',
        entityType: 'AUTH',
        metadata: { reason: 'clinic_scope_mismatch', effective, home },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(403).json({ success: false, error: 'Clinic scope mismatch' });
      return;
    }
  }

  req.businessClinicId = effective;
  next();
}
