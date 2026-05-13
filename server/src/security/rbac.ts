/**
 * Canonical RBAC helpers — keep permission logic out of route handlers where possible.
 * Legacy roles (RECEPTIONIST, LAB_TECH, TENANT, CLINIC_OWNER, PENDING_APPROVAL, …) remain valid
 * in `User.role`; these helpers express product rules for the four primary personas + platform.
 */

export const PrimaryRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  DOCTOR: 'DOCTOR',
  STORE_MANAGER: 'STORE_MANAGER',
} as const;

/** Clinic-scoped ecommerce / catalog operators (no clinical EMR). */
export function isStoreOnlyRole(role: string | undefined | null): boolean {
  const r = (role ?? '').trim();
  return r === 'TENANT' || r === PrimaryRole.STORE_MANAGER || r === 'SELLER';
}

export function isSuperAdminRole(role: string | undefined | null): boolean {
  return (role ?? '').trim() === PrimaryRole.SUPER_ADMIN;
}

/** Full clinic administration (not platform super-admin). */
export function isClinicAdministratorRole(role: string | undefined | null): boolean {
  const r = (role ?? '').trim();
  return r === PrimaryRole.CLINIC_ADMIN || r === 'CLINIC_OWNER';
}

const DPMS_PATH_PREFIXES: readonly string[] = [
  '/api/dashboard',
  '/api/communication',
  '/api/activity',
  '/api/clinic',
  '/api/settings',
];

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** True when this API path is clinic/DPMS surface (not auth, not retail product routes). */
export function isDpmsApiPath(path: string): boolean {
  const p = path.split('?')[0] || '';
  return DPMS_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(p, prefix));
}
