/**
 * Mirrors server `RoleKeyword` groups for UI guards.
 * @see server/src/middleware/requireRole.ts
 */
export type RoleKeyword = 'ADMIN' | 'TENANT' | 'SAAS_TENANT';

const KEYWORD_MEMBERS: Record<RoleKeyword, readonly string[]> = {
  ADMIN: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'CLINIC_OWNER'],
  TENANT: ['TENANT'],
  SAAS_TENANT: ['TENANT', 'DOCTOR', 'CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN'],
};

/** Returns true if the user's DB role satisfies the given keyword (or exact role string). */
export function requireRoleUI(role: string | undefined | null, keyword: RoleKeyword | string): boolean {
  const r = (role || '').trim();
  if (!r) return false;
  if (keyword === 'ADMIN' || keyword === 'TENANT' || keyword === 'SAAS_TENANT') {
    return KEYWORD_MEMBERS[keyword].includes(r);
  }
  return r === keyword;
}

export function requireAnyRoleUI(role: string | undefined | null, keywords: Array<RoleKeyword | string>): boolean {
  return keywords.some((k) => requireRoleUI(role, k));
}
