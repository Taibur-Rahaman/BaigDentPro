/**
 * Receptionist route block — surgical 403 wrapper.
 *
 * Receptionists must NOT access billing/subscription pages or the clinic
 * activity timeline. The frontend already hides those menu links, but the
 * backend routes still allowed `RECEPTIONIST` (see `routes/activity.ts`).
 * This middleware is mounted at the top of `/api/subscription` and
 * `/api/activity` to enforce the rule additively without modifying
 * existing role lists.
 *
 * Self-healing invariant: if this guard ever runs before authentication
 * has populated `req.user`, it returns 500 instead of silently passing.
 * That cannot happen when the route is mounted via `rbacGuardBuilder`
 * (role gate runs first and 401s on missing user). If it does happen,
 * the 500 surfaces a wiring bug immediately rather than masking it as a
 * permissive pass-through.
 */
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

export function blockReceptionist(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const role = (a.user?.role ?? '').trim();

  if (!a.user || !role) {
    res
      .status(500)
      .json({ success: false, error: 'RBAC pipeline not initialized' });
    return;
  }

  if (role === 'RECEPTIONIST') {
    res
      .status(403)
      .json({ success: false, error: 'This page is not available for receptionist accounts.' });
    return;
  }

  next();
}
