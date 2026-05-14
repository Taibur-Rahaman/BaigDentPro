/** Roles that use the isolated Starter (EMR desk) workspace — not clinic-operator shell. */
export const STARTER_STAFF_ROLES = [
  'DOCTOR',
  'RECEPTIONIST',
  'DENTAL_ASSISTANT',
  'LAB_TECH',
] as const;

export type StarterStaffRole = (typeof STARTER_STAFF_ROLES)[number];

export function isStarterStaffRole(role: string | undefined): boolean {
  const r = (role ?? '').trim();
  return (STARTER_STAFF_ROLES as readonly string[]).includes(r);
}
