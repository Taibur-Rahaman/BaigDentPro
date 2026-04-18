import type { AuthRequest } from '../middleware/auth.js';

/** Clinic scope for business routes (set by `requireClinicScope` after auth). */
export function resolveBusinessClinicId(req: AuthRequest): string {
  const id = req.businessClinicId ?? req.effectiveClinicId ?? req.user?.clinicId;
  if (!id?.trim()) {
    throw Object.assign(new Error('Missing clinic scope'), { status: 403 });
  }
  return id.trim();
}
