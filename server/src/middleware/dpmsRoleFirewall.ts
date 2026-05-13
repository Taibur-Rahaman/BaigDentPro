import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { isDpmsApiPath, isStoreOnlyRole, isSuperAdminRole } from '../security/rbac.js';

/**
 * Store-only accounts (TENANT, STORE_MANAGER) must not hit DPMS JSON APIs, even if feature flags
 * would allow — role wins over `ClinicFeatureFlag` for safety.
 * SUPER_ADMIN always passes (platform operations + impersonation flows).
 */
export function blockStoreOnlyFromDpmsApi(req: Request, res: Response, next: NextFunction): void {
  const path = (req.originalUrl || req.url || '').split('?')[0] || '';
  if (!path.startsWith('/api/') || !isDpmsApiPath(path)) {
    next();
    return;
  }
  const a = req as AuthRequest;
  const role = a.user?.role;
  if (!role) {
    next();
    return;
  }
  if (isSuperAdminRole(role)) {
    next();
    return;
  }
  if (isStoreOnlyRole(role)) {
    res.status(403).json({
      success: false,
      error: 'This account is limited to shop catalog and orders. Use a clinical staff login for practice features.',
    });
    return;
  }
  next();
}
