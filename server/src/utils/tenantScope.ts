import type { AuthRequest } from '../middleware/auth.js';

/**
 * Central tenant scoping: all SaaS catalog queries MUST merge clinicId from the resolved request scope.
 * `req.effectiveClinicId` is set by `authenticate` (JWT + impersonation rules); subscription is verified separately.
 */
export function assertTenantRequest(req: AuthRequest): void {
  if (!req.user?.id) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  const cid = req.effectiveClinicId ?? req.user.clinicId;
  if (!cid) {
    throw Object.assign(new Error('No tenant scope'), { status: 403 });
  }
}

/** Resolved clinic id for Prisma `where` (never trust client-supplied clinicId). */
export function resolveTenantClinicId(req: AuthRequest): string {
  assertTenantRequest(req);
  const cid = req.effectiveClinicId ?? req.user!.clinicId;
  if (!cid) {
    throw Object.assign(new Error('No tenant scope'), { status: 403 });
  }
  return cid;
}

export function scopeByTenant(clinicId: string, extra: Record<string, unknown> = {}) {
  return { clinicId, ...extra };
}

export function scopeProductWhere(clinicId: string, extra: { id?: string } = {}) {
  return scopeByTenant(clinicId, extra);
}

export function scopeOrderWhere(clinicId: string, extra: { id?: string } = {}) {
  return scopeByTenant(clinicId, extra);
}
