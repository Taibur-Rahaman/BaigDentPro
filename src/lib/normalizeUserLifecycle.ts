/**
 * Client-side mirror of `server/src/security/normalizeUserLifecycle.ts`.
 *
 * Used at the response-consumption boundary in the admin user grid so the
 * UI never displays a contradictory snapshot (e.g. ACTIVE row showing as
 * inactive). Backward-compatible: only ever lifts `isActive`/`isApproved`
 * to `true` when `accountStatus === 'ACTIVE'`; never downgrades.
 */

type LifecycleShape = {
  accountStatus?: string | null;
  isActive?: boolean | null;
  isApproved?: boolean | null;
};

export function normalizeUserLifecycle<T extends LifecycleShape>(user: T): T;
export function normalizeUserLifecycle<T extends LifecycleShape>(
  user: T | null | undefined,
): T | null | undefined;
export function normalizeUserLifecycle<T extends LifecycleShape>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  const status = String(user.accountStatus ?? '').toUpperCase();
  if (status !== 'ACTIVE') return user;
  return {
    ...user,
    isActive: true,
    isApproved: true,
  };
}

export function normalizeUserLifecycleList<T extends LifecycleShape>(rows: readonly T[]): T[] {
  return rows.map((row) => normalizeUserLifecycle(row));
}
