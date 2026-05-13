/**
 * Runtime lifecycle normalization (no DB writes).
 *
 * Whenever `accountStatus === 'ACTIVE'`, the user must also surface as
 * `isActive: true` and `isApproved: true` to the client. The three columns
 * remain independent in the database — this helper only harmonises the
 * shape of HTTP responses so the admin UI never receives a contradictory
 * snapshot (e.g. `accountStatus=ACTIVE` with `isApproved=false`).
 */

type LifecycleShape = {
  accountStatus?: string | null;
  isActive?: boolean | null;
  isApproved?: boolean | null;
};

export function normalizeLifecycle<T extends LifecycleShape>(user: T): T;
export function normalizeLifecycle<T extends LifecycleShape>(
  user: T | null | undefined,
): T | null | undefined;
export function normalizeLifecycle<T extends LifecycleShape>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  const status = String(user.accountStatus ?? '').toUpperCase();
  if (status !== 'ACTIVE') {
    return user;
  }
  return {
    ...user,
    isActive: true,
    isApproved: true,
  };
}
