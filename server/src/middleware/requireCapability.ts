import type { NextFunction, RequestHandler, Response } from 'express';
import type { AuthRequest } from './auth.js';
import type { Capability } from '../security/capabilities.js';
import { requestHasCapability } from '../security/capabilityAuthorize.js';

/** Express middleware — additive on top of RBAC / firewalls; forwards errors to `next(err)`. */
export function requireCapability(capability: Capability): RequestHandler {
  return async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ok = await requestHasCapability(req as AuthRequest, capability);
      if (!ok) {
        res.status(403).json({ success: false, error: 'Forbidden', requiredCapability: capability });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
