/**
 * RBAC Guard Builder — type-safe composition helper.
 *
 * Generates a deterministic `RequestHandler[]` from a declarative options
 * object so route files no longer hand-order role / capability / blocker
 * calls. This does NOT change Express's execution model:
 *
 *   - `authenticate` is mounted globally elsewhere and is NOT injected here.
 *   - Each entry the builder emits is a real Express middleware (the
 *     return value of the corresponding factory call).
 *   - The builder produces an array; callers spread it into `router.use(...)`.
 *
 * Order emitted (always):
 *   1. `requireRole(...roles)` when `roles` provided
 *   2. `requireCapability(capability)` when `capability` provided
 *   3. `...extra` (additional context-aware guards such as `blockReceptionist`)
 *
 * This matches the convention defined in the corrected RBAC spec: roles
 * gate first, then capability gate, then context-aware blockers. Because
 * `requireRole` short-circuits with 401 when `req.user` is missing, any
 * `extra` guard is guaranteed to run only after authentication has
 * populated `req.user` — making the blocker's own "RBAC not initialized"
 * 500 a self-healing tripwire rather than a normal code path.
 */
import type { RequestHandler } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import { requireCapability } from '../middleware/requireCapability.js';
import type { Capability } from './capabilities.js';

type RoleArg = Parameters<typeof requireRole>[0];

export type RbacGuardOptions = {
  /** Role list passed to `requireRole`. Same accepted values: keywords or DB role strings. */
  roles?: readonly RoleArg[];
  /** Capability checked via `requireCapability`. */
  capability?: Capability;
  /** Additional context-aware guards mounted after role + capability. */
  extra?: readonly RequestHandler[];
};

export function rbacGuardBuilder(opts: RbacGuardOptions): RequestHandler[] {
  const stack: RequestHandler[] = [];

  if (opts.roles && opts.roles.length > 0) {
    stack.push(requireRole(...opts.roles));
  }

  if (opts.capability) {
    stack.push(requireCapability(opts.capability));
  }

  if (opts.extra && opts.extra.length > 0) {
    stack.push(...opts.extra);
  }

  return stack;
}
