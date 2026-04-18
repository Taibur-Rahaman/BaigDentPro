import type { AuthRequest } from '../middleware/auth.js';

/** Resolved clinic scope for tenant isolation (JWT + impersonation). */
export function resolveRequestClinicId(req: AuthRequest): string | null {
  const id = req.effectiveClinicId ?? req.user?.clinicId;
  if (typeof id !== 'string') return null;
  const t = id.trim();
  return t.length ? t : null;
}

export function requireRequestClinicId(req: AuthRequest): string {
  const id = resolveRequestClinicId(req);
  if (!id) {
    throw Object.assign(new Error('No clinic scope'), { status: 403 });
  }
  return id;
}
