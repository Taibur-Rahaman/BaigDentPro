import type { Request, Response } from 'express';
import type { AuthRequest } from './auth.js';
import { writeAuditLog } from '../services/auditLogService.js';

const EMR_PREFIXES = ['/api/patients', '/api/appointments', '/api/invoices', '/api/prescriptions', '/api/lab'];

function pathOnly(url: string): string {
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

/** Attach once per response: audit every EMR HTTP call after completion (success or failure). */
export function attachEmrResponseAudit(req: Request, res: Response): void {
  const path = pathOnly(req.originalUrl || '');
  if (!EMR_PREFIXES.some((p) => path.startsWith(p))) return;
  const locals = res.locals as { __emrAuditAttached?: boolean };
  if (locals.__emrAuditAttached) return;
  locals.__emrAuditAttached = true;

  res.on('finish', () => {
    const a = req as AuthRequest;
    if (!a.user?.id) return;
    const method = req.method.toUpperCase();
    const ok = res.statusCode >= 200 && res.statusCode < 400;
    let action: string;
    if (!ok) {
      action = `EMR_${method}_FAILED`;
    } else if (method === 'POST') {
      action = 'EMR_CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'EMR_UPDATE';
    } else if (method === 'DELETE') {
      action = 'EMR_DELETE';
    } else {
      action = 'EMR_READ';
    }
    void writeAuditLog({
      userId: a.user.id,
      clinicId: a.businessClinicId ?? a.effectiveClinicId ?? a.user.clinicId ?? null,
      action,
      entityType: 'EMR_HTTP',
      metadata: {
        path: req.originalUrl || req.url,
        method: req.method,
        statusCode: res.statusCode,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
  });
}
