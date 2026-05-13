/**
 * Mirrors server `RoleKeyword` groups for UI guards.
 * @see server/src/middleware/requireRole.ts
 *
 * `ENTERPRISE_ADMIN` is **frontend-only**: `/dashboard/admin/*` shell (platform + org owner).
 * `ADMIN` still mirrors the server keyword (includes `CLINIC_ADMIN`) for clinic-scoped admin UX
 * that must stay aligned with `/api/admin/*` access — do not use `ADMIN` for the enterprise shell.
 */
export type RoleKeyword = 'ADMIN' | 'TENANT' | 'SAAS_TENANT' | 'ENTERPRISE_ADMIN';

const KEYWORD_MEMBERS: Record<RoleKeyword, readonly string[]> = {
  ADMIN: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'CLINIC_OWNER'],
  TENANT: ['TENANT'],
  /** Mirrors server: retail catalog tenants — excludes clinicians (they use DPMS only). */
  SAAS_TENANT: ['TENANT', 'STORE_MANAGER', 'SELLER', 'CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN'],
  /** Enterprise chrome only — not clinic-operator admins (`CLINIC_ADMIN` uses clinic routes). */
  ENTERPRISE_ADMIN: ['SUPER_ADMIN', 'CLINIC_OWNER', 'ADMIN'],
};

/** Returns true if the user's DB role satisfies the given keyword (or exact role string). */
export function requireRoleUI(role: string | undefined | null, keyword: RoleKeyword | string): boolean {
  const r = (role || '').trim();
  if (!r) return false;
  if (
    keyword === 'ADMIN' ||
    keyword === 'TENANT' ||
    keyword === 'SAAS_TENANT' ||
    keyword === 'ENTERPRISE_ADMIN'
  ) {
    return KEYWORD_MEMBERS[keyword].includes(r);
  }
  return r === keyword;
}

export function requireAnyRoleUI(role: string | undefined | null, keywords: Array<RoleKeyword | string>): boolean {
  return keywords.some((k) => requireRoleUI(role, k));
}
