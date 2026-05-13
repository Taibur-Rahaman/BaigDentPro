/**
 * Clinical workspace routes are flat: `/dashboard/<segment>`.
 * Legacy `/dashboard/practice/<segment>` redirects (see `PracticeLegacyRedirect`).
 */
export type PracticeNavSection =
  | 'dashboard'
  | 'shop-dashboard'
  | 'patients'
  | 'patient-detail'
  | 'prescription'
  | 'prescriptions-list'
  | 'appointments'
  | 'billing'
  | 'lab'
  | 'drugs'
  | 'sms'
  | 'settings'
  | 'practice-reports'
  | 'clinic-admin'
  | 'super-admin';

/** First path segment after `/dashboard/` → workspace nav section */
export const PRACTICE_PATH_TO_NAV: Record<string, PracticeNavSection> = {
  overview: 'dashboard',
  patients: 'patients',
  prescription: 'prescription',
  prescriptions: 'prescriptions-list',
  appointments: 'appointments',
  billing: 'billing',
  lab: 'lab',
  drugs: 'drugs',
  sms: 'sms',
  'workspace-settings': 'settings',
  reports: 'practice-reports',
};

export const NAV_TO_PRACTICE_PATH: Partial<Record<PracticeNavSection, string>> = {
  dashboard: 'overview',
  patients: 'patients',
  prescription: 'prescription',
  'prescriptions-list': 'prescriptions',
  appointments: 'appointments',
  billing: 'billing',
  lab: 'lab',
  drugs: 'drugs',
  sms: 'sms',
  settings: 'workspace-settings',
  'practice-reports': 'reports',
};

export function practiceWorkspaceHref(segment: string): string {
  return `/dashboard/${segment}`;
}

/** True when pathname is a clinical workspace URL (flat `/dashboard/...`). */
export function isClinicalWorkspacePathname(pathname: string): boolean {
  const m = pathname.match(/^\/dashboard\/([^/?]+)\/?$/);
  if (!m) return pathname === '/dashboard/practice';
  return Boolean(PRACTICE_PATH_TO_NAV[m[1]]);
}
