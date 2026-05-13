/** Roles SUPER_ADMIN may assign — extend with current row role when missing. */
export const SUPER_ASSIGNABLE_ROLES = [
  'DOCTOR',
  'RECEPTIONIST',
  'STORE_MANAGER',
  'CLINIC_ADMIN',
  'CLINIC_OWNER',
  'SUPER_ADMIN',
] as const;

export function superRoleSelectOptions(currentRole: string): readonly string[] {
  const set = new Set<string>(SUPER_ASSIGNABLE_ROLES);
  set.add(currentRole);
  return [...set].sort((a, b) => a.localeCompare(b));
}
