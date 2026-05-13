/**
 * Soft Role Gate — additive route-level wrapper.
 *
 * Pure function `softRoleGate(role, route)` returns `false` for the three
 * unambiguous leakage patterns:
 *
 *   - DOCTOR hitting any `/admin` URL.
 *   - SELLER (TENANT / STORE_MANAGER) hitting anything that is not `/shop`.
 *   - CLINIC_ADMIN hitting `/shop` (clinic admins manage clinic, not retail).
 *
 * The Express middleware factory `softRoleGateMiddleware()` wraps this rule
 * but is intentionally **not mounted globally** — call sites opt in
 * per-router so existing canonical guards (`requireRole`, `requireCapability`,
 * `blockStoreOnlyFromDpmsApi`) keep authority over current production
 * behaviour.
 *
 * Backward-compatibility note: the CLINIC_ADMIN/SELLER rules may overlap
 * with the current capability engine (which grants `shop_access` to clinic
 * admins via plan features). Do not mount this middleware on `/api/shop`
 * routes without first confirming the policy with the platform owner.
 */
import type { Request, RequestHandler, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { SoftRoles, isSeller } from './softRoleModel.js';

export function softRoleGate(userRole: string, route: string): boolean {
  const role = (userRole ?? '').trim();
  const path = String(route ?? '');

  if (role === SoftRoles.DOCTOR && path.includes('/admin')) return false;
  if (isSeller(role) && !path.includes('/shop')) return false;
  if (role === SoftRoles.CLINIC_ADMIN && path.includes('/shop')) return false;

  return true;
}

export type SoftRoleGateOptions = {
  /**
   * When `false`, the middleware logs denials but does NOT 403 — safe to
   * mount in audit-only mode before tightening behaviour.
   */
  enforce?: boolean;
  /**
   * Optional tag used in the warning log so multiple opt-in mounts can be
   * distinguished in the operator's PM2 output.
   */
  tag?: string;
};

export function softRoleGateMiddleware(opts: SoftRoleGateOptions = {}): RequestHandler {
  const enforce = opts.enforce ?? false;
  const tag = opts.tag ?? 'softRoleGate';
  return (req: Request, res: Response, next: NextFunction): void => {
    const a = req as AuthRequest;
    const role = a.user?.role ?? '';
    const route = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
    if (softRoleGate(role, route)) {
      return next();
    }
    console.warn(`[${tag}] denied`, { role, route });
    if (!enforce) {
      return next();
    }
    res.status(403).json({ success: false, error: 'Forbidden by soft role policy' });
  };
}
