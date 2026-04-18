import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

/** Blocks billing / subscription mutations while a SUPER_ADMIN is impersonating a clinic. */
export function blockImpersonationBilling(_req: AuthRequest, res: Response, next: NextFunction): void {
  const req = _req as AuthRequest;
  if (req.impersonating === true) {
    res.status(403).json({
      success: false,
      error: 'Billing and subscription changes are disabled during impersonation.',
    });
    return;
  }
  next();
}
