import { STARTER_SIDEBAR_ITEMS } from '@/config/practiceSidebar/starterSidebarItems';

const FORBIDDEN_SEGMENTS = new Set([
  'branches',
  'inventory',
  'reports',
  'activity',
  'shop',
  'insurance',
  'communication',
  'staff-schedule',
  'subscription',
  'plans',
  'billing-console',
  'clinic-control',
  'patient-portal',
  'invites',
  'products',
  'orders',
  'admin',
]);

/**
 * DEV-only: doctor starter menu must never include clinic/growth/shop segments.
 */
export function devAssertDoctorStarterSidebar(userRole: string | undefined): void {
  const isDev =
    import.meta.env.DEV || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
  if (!isDev) return;
  if ((userRole ?? '').trim() !== 'DOCTOR') return;

  for (const item of STARTER_SIDEBAR_ITEMS) {
    const seg = item.pathSegment.toLowerCase();
    if (FORBIDDEN_SEGMENTS.has(seg)) {
      console.error(
        `[BaigDentPro] Doctor starter sidebar leak: forbidden segment "${item.pathSegment}" on item "${item.id}".`,
      );
    }
  }
}
