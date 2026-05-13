/**
 * Single-decision wrappers for route / shell access (normalization layer).
 * Prefer these over ad-hoc `role === …` checks in navigation and redirects.
 */
import { requireRoleUI } from '@/lib/roles';

/** Platform enterprise shell at `/dashboard/admin/*` — not `CLINIC_ADMIN` (clinic routes only). */
export function canAccessEnterpriseAdminRoute(role: string | undefined | null): boolean {
  return requireRoleUI(role, 'ENTERPRISE_ADMIN');
}

/** Shop-first accounts: no clinical DPMS workspace. */
export function canAccessCommerceOnlyAccount(role: string | undefined | null): boolean {
  const r = (role || '').trim();
  return r === 'TENANT' || r === 'STORE_MANAGER' || r === 'SELLER';
}

/** Retail catalog / orders surface (mirrors `SAAS_TENANT` keyword). */
export function canAccessCommerceRoute(role: string | undefined | null): boolean {
  return requireRoleUI(role, 'SAAS_TENANT');
}

/** Clinical / shared clinic dashboard (excludes commerce-only personas). */
export function canAccessClinicRoute(role: string | undefined | null): boolean {
  const r = (role || '').trim();
  if (!r) return false;
  return !canAccessCommerceOnlyAccount(r);
}

/** Login shell: roles that may omit `clinicId` without forcing re-login (mirrors prior rules). */
export function isClinicAssignmentOptional(role: string | undefined | null): boolean {
  const r = (role || '').trim();
  return r === 'SUPER_ADMIN' || r === 'ADMIN';
}
