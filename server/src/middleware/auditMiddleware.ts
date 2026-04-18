import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import type { AuthRequest } from './auth.js';
import { writeAuditLog } from '../services/auditLogService.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const EMR_PATH_PREFIXES = ['/api/patients', '/api/appointments', '/api/invoices', '/api/prescriptions', '/api/lab'];

function isEmrMutationPath(path: string): boolean {
  return EMR_PATH_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * Best-effort HTTP audit for authenticated mutating API calls (complements targeted audit writes).
 */
export function auditHttpMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origJson = res.json.bind(res);
  res.json = function auditWrappedJson(body: unknown) {
    try {
      const a = req as AuthRequest;
      const path = req.originalUrl || req.url || '';
      if (a.user?.id && MUTATING.has(req.method) && path.startsWith('/api')) {
        const status = res.statusCode;
        const clinicId = a.effectiveClinicId ?? a.user.clinicId ?? null;
        if (status < 400) {
          void writeAuditLog({
            userId: a.user.id,
            clinicId,
            action: `HTTP_${req.method}`,
            entityType: 'HTTP',
            entityId: null,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
            metadata: {
              path: req.originalUrl || req.url,
              statusCode: status,
            },
          });
        } else if (status >= 400 && isEmrMutationPath(path)) {
          void writeAuditLog({
            userId: a.user.id,
            clinicId,
            action: `EMR_MUTATION_FAILED_${req.method}`,
            entityType: 'HTTP_EMR',
            entityId: null,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
            metadata: {
              path: req.originalUrl || req.url,
              statusCode: status,
            },
          });
        }
      }
    } catch {
      /* ignore */
    }
    return origJson(body);
  };
  next();
}
