# SUPER_ADMIN enterprise control center — delivery report

Date: 2026-05-09 (session). Scope: information architecture, UI shell, admin API hardening, login hot-path DB reduction.

## 1. Information architecture (routes)

Base: `/dashboard/admin` (Role keyword `ADMIN` — includes `SUPER_ADMIN`).

| Module | Path |
|--------|------|
| Executive dashboard | `/dashboard/admin` |
| Tenant management | `/dashboard/admin/tenants` (legacy `/clinics` redirects) |
| Users | `/dashboard/admin/users` |
| Roles & permissions | `/dashboard/admin/roles-capabilities` (**SUPER_ADMIN** only) |
| SaaS orders | `/dashboard/admin/billing/orders` (legacy `/orders` redirects) |
| Plan payments | `/dashboard/admin/billing/plan-payments` (**SUPER_ADMIN** only; legacy `/subscription-payments` redirects) |
| System monitoring | `/dashboard/admin/monitoring` |
| Security & audit | `/dashboard/admin/security/audit` (legacy `/logs` redirects) |
| Support ops | `/dashboard/admin/support` (**SUPER_ADMIN** only) |
| Branding | `/dashboard/admin/branding` |
| Settings center | `/dashboard/admin/settings` (documents server `.env`; no secret editing in SPA) |

**Command palette:** `⌘K` / `Ctrl+K` jumps to registered modules (client-side filter).

**Deep clinical / multi-entity super-admin tools** (doctors, patients, prescriptions, demo reset) remain in **Practice workspace → Super Admin** tab; they already call `/api/super-admin/*`.

## 2. Backend permission matrix (summary)

| Actor | `/api/admin/*` | Capability-gated writes |
|-------|----------------|-------------------------|
| `SUPER_ADMIN` | Global data scope (unless impersonating a clinic). `requestHasCapability` short-circuits **true** for all capabilities. | Same as today: `clinic:users:manage` routes still run, but SUPER_ADMIN always passes. |
| `CLINIC_ADMIN` / `CLINIC_OWNER` | Clinic-scoped lists and mutations where applicable. | Cannot assign `SUPER_ADMIN`; cannot set passwords; cannot reassign `clinicId`; cannot change `accountStatus` / arbitrary `isApproved` from other tenants. |

New / extended **user admin** capabilities (via `PUT /api/admin/users/:id`):

- **SUPER_ADMIN only:** `password`, `clinicId`, `accountStatus`, `isApproved` (with session invalidation when appropriate).
- **POST `/api/admin/users/:id/revoke-sessions`:** refresh token purge + `sessionVersion` bump (`bumpSessionVersion`).

Assignable roles for clinic operators now include **`CLINIC_OWNER`** in the server allow-list; platform assignable set adds **`SUPER_ADMIN`** for promotions (audited via existing activity/audit hooks).

## 3. Performance — auth login

**Change:** `POST /auth/login` now loads subscription + tenant payload in **one** `loadLoginSubscriptionContext()` pass (single parallel `subscription` + `clinic` read, then shared `resolveDeviceLimit` / product features), removing duplicate `findUnique` work and the extra `user` read for profile/sessionVersion when the full login select succeeds.

**Remaining latency:** remote Postgres pool (Supavisor) RTT and bcrypt cost **12** still dominate on cold paths; target **&lt;500 ms** locally requires infrastructure (regional DB, warm pool, optional lower rounds only in dev behind env — not shipped here).

## 4. Security posture

- Session invalidation on password change, clinic move, role change, lifecycle/accountStatus change, and forced revoke endpoint.
- SUPER_ADMIN bypass remains explicit in `capabilityAuthorize.requestHasCapability`; tenant isolation for non-super users unchanged.
- Settings center **does not** expose secret editing (reduces XSS blast radius).

## 5. UI improvement summary

- Enterprise shell: collapsible sidebar, sectioned nav, breadcrumb strip, responsive collapse on small screens (`enterprise-admin.css`).
- Executive view enriches SUPER_ADMIN with **`/api/super-admin/stats`** KPI strip.
- Users grid adds SUPER_ADMIN operational controls (role, clinic reassignment, lifecycle, suspend, revoke sessions, password reset).
- Capability matrix page surfaces existing **override panel** in the admin SPA (no longer only inside practice workspace).

## 6. Remaining technical debt / recommended upgrades

Not implemented (would require new tables, workers, or external SaaS):

- Support ticketing, coupons, automated dunning, MFA enrollment UI, queue/cron introspection, webhook replay, anomaly IP blocking UI, maintenance mode flags in DB, rollout manager, virtualization for very large directories, true dark-mode tokens, E2E suite for all new routes.

**Frontend typecheck:** Repo still has pre-existing `tsc` errors in `SuperAdminPendingApprovalsTable`, `useInvitesDashboardView`, and `usePortalAuthView` unrelated to this change set; address in a dedicated hygiene PR.

**Suggested next steps:**

1. Fix global `tsc --noEmit` hygiene.
2. Extract shared `Users` table into virtualized component when `total` &gt; 500.
3. Optional `BCRYPT_ROUNDS` env for non-production only if security review approves.
