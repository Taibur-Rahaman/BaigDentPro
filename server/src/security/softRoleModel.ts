/**
 * Soft Role Model — additive vocabulary for the four primary personas.
 *
 * Existing canonical helpers in `./rbac.ts` (and `requireRole.ts`) remain
 * authoritative for guards. This module only exposes simple persona checks
 * for new code paths that need a quick boolean without expanding RBAC.
 */

export const SoftRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  DOCTOR: 'DOCTOR',
  SELLER: 'SELLER',
} as const;

export type SoftRole = (typeof SoftRoles)[keyof typeof SoftRoles];

export function isClinicController(role: string | null | undefined): boolean {
  return (role ?? '').trim() === SoftRoles.CLINIC_ADMIN;
}

export function isDoctor(role: string | null | undefined): boolean {
  return (role ?? '').trim() === SoftRoles.DOCTOR;
}

/**
 * Conceptual "seller" persona. The DB stores retail-only operators as
 * `TENANT` or `STORE_MANAGER`; this helper recognises either literal so
 * call sites do not need to repeat that detail.
 */
export function isSeller(role: string | null | undefined): boolean {
  const r = (role ?? '').trim();
  return r === SoftRoles.SELLER || r === 'TENANT' || r === 'STORE_MANAGER';
}
