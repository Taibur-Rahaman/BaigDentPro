import type { Request, Response, NextFunction } from 'express';
import { authenticate, type AuthRequest } from './auth.js';
import { requireClinicScope } from './requireClinicScope.js';
import { requireActiveSubscription } from './clinicSubscription.js';
import { businessClinicContext } from '../context/businessClinicContext.js';
import { attachEmrResponseAudit } from './emrComprehensiveAudit.js';

function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** No global auth+clinic gate (routes supply their own auth or are public). */
const EXEMPT_AUTH_CLINIC_PREFIXES: readonly string[] = [
  '/api/auth',
  '/api/health',
  '/api/admin',
  '/api/super-admin',
  '/api/shop',
  '/api/invite/preview',
  '/api/invite/accept',
  '/api/billing/webhook',
  '/api/payment/webhook',
];

const EXEMPT_SUBSCRIPTION_PREFIXES: readonly string[] = [
  ...EXEMPT_AUTH_CLINIC_PREFIXES,
  '/api/billing',
  '/api/payment/initiate',
  '/api/subscription',
  '/api/invite',
  '/api/db',
];

function exemptAuthClinic(path: string): boolean {
  return EXEMPT_AUTH_CLINIC_PREFIXES.some((p) => matchesPrefix(path, p));
}

function exemptSubscription(path: string): boolean {
  return EXEMPT_SUBSCRIPTION_PREFIXES.some((p) => matchesPrefix(path, p));
}

/**
 * Global gate: authenticate + clinic scope for all `/api/**` except admin, auth, shop, public invites, webhooks.
 */
export function businessApiAuthAndClinic(req: Request, res: Response, next: NextFunction): void {
  const path = pathOnly(req.originalUrl || '');
  if (!path.startsWith('/api/') || exemptAuthClinic(path)) {
    next();
    return;
  }
  authenticate(req, res, () => {
    if (res.headersSent) return;
    requireClinicScope(req as AuthRequest, res, () => {
      if (res.headersSent) return;
      const cid = (req as AuthRequest).businessClinicId?.trim();
      if (cid) {
        attachEmrResponseAudit(req, res);
        businessClinicContext.run({ clinicId: cid }, () => next());
        return;
      }
      next();
    });
  });
}

/**
 * Global subscription enforcement (DB-backed). Exempts auth, admin, billing, payment, subscription upgrade, invites, health, shop.
 */
export function businessApiSubscription(req: Request, res: Response, next: NextFunction): void {
  const path = pathOnly(req.originalUrl || '');
  if (!path.startsWith('/api/') || exemptSubscription(path)) {
    next();
    return;
  }
  void requireActiveSubscription(req as AuthRequest, res, next);
}
