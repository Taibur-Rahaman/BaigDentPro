import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { logActivity } from '../services/clinicActivityLogService.js';

function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

/**
 * Best-effort mutation audit: logs successful POST/PUT/PATCH/DELETE for authenticated business APIs.
 * Detailed domain events (e.g. LOGIN_SUCCESS) remain in route handlers where context is richer.
 */
export function autoActivityLogger(req: Request, res: Response, next: NextFunction): void {
  const path = pathOnly(req.originalUrl || '');
  if (!path.startsWith('/api/') || path.startsWith('/api/auth') || path.startsWith('/api/health')) {
    next();
    return;
  }

  res.on('finish', () => {
    try {
      if (res.statusCode >= 400) return;
      const method = req.method.toUpperCase();
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
      const r = req as AuthRequest;
      if (!r.user?.id) return;
      const clinicId = r.businessClinicId ?? r.effectiveClinicId ?? r.user.clinicId;
      if (!clinicId) return;
      void logActivity({
        userId: r.user.id,
        clinicId,
        action: 'API_MUTATION',
        entity: 'HTTP',
        entityId: null,
        meta: { method, path: path.slice(0, 240) },
        req,
      });
    } catch {
      /* ignore */
    }
  });

  next();
}
