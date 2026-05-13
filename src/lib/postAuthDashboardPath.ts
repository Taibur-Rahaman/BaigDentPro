import type { AppUser } from '@/types/appUser';

/** Default authenticated landing path by role (see P0 entry experience). */
export function postAuthDashboardPath(user: Pick<AppUser, 'role'> | null | undefined): string {
  const r = (user?.role ?? '').trim();
  if (r === 'SUPER_ADMIN' || r.toLowerCase() === 'superadmin') return '/dashboard/admin';
  if (r === 'TENANT' || r === 'STORE_MANAGER' || r === 'SELLER') return '/dashboard';
  if (r === 'DOCTOR' || r === 'RECEPTIONIST') return '/dashboard/practice/overview';
  if (r === 'ADMIN') return '/dashboard/admin';
  if (r === 'CLINIC_ADMIN' || r === 'CLINIC_OWNER') return '/dashboard/practice/overview';
  return '/dashboard';
}

/** When `from` is the generic dashboard root, prefer the role-based default. */
export function resolveLoginDestination(
  user: Pick<AppUser, 'role'> | null | undefined,
  from: string | undefined
): string {
  const raw = (from || '/dashboard').trim() || '/dashboard';
  if (raw === '/dashboard' || raw.startsWith('/dashboard?')) {
    return postAuthDashboardPath(user);
  }
  return raw;
}
