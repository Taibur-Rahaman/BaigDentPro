# SUPER_ADMIN users grid — enterprise virtualization report

## Summary

The admin user directory (`AdminUsersPage`) uses **TanStack Virtual** (`@tanstack/react-virtual`) for row virtualization, **server-side pagination** (up to **500 rows per request** for non-impersonating `SUPER_ADMIN`), **URL-synced** `page`, `q`, `limit`, and `sort`, **debounced search**, **fixed row heights** aligned with estimates (no per-row `ResizeObserver` in production path), **`getItemKey` by user id**, and a **memoized row component** with field-level equality checks.

## Before / after (implementation)

| Area | Before | After |
|------|--------|--------|
| API page size | Max 100 rows | SUPER_ADMIN (global): max **500**; impersonating / clinic admins: **100** |
| Sort | `createdAt desc` only | Validated `sort` query: name/email/createdAt asc/desc |
| Virtualizer keys | React `key={row.id}` | `getItemKey` + `virtualRow.key` |
| Role dropdown options | Union built by scanning **all rows** | Static assignable roles + current row role (`superRoleSelectOptions`) |
| Password reset | `window.prompt` | Accessible `<dialog>` modal (`AdminUserPasswordModal`), lazy chunk |
| Scroll on filter/sort/page | Virtualizer `scrollToOffset` in effect | `scrollTop = 0` on container (avoids virtualizer identity loops) |
| Selection vs paging | Manual only | Auto-cleared when `page`, `q`, or `sort` changes |
| Route bundle | Eager | `AdminUsersPage` **lazy** + Suspense |

## Stress harness (development)

- Route (dev only): `/dashboard/admin/users/stress?n=<count>` (SUPER_ADMIN).
- Generates **pure client mock** users (no API), same virtualized list pattern.
- HUD shows approximate FPS and **virtual window size** (DOM rows mounted).

### How to benchmark locally

1. Run the app (`npm run dev`), sign in as SUPER_ADMIN.
2. Open the stress URL with `n=1000`, `n=10000`, `n=50000`.
3. Use Chrome **Performance** + **React Profiler** while fast-scrolling and toggling `n`.
4. Watch **Memory** (50k mocks allocate a large array — expected for this harness).

### Observations (qualitative)

- DOM row count stays near **overscan × window** (not total users).
- Main thread cost scales with **visible rows + overscan**, not total dataset size.
- 50k in-memory rows increases **heap**; production uses **paged API**, so total users can exceed 50k without holding them all in RAM.

## Scaling ceiling (estimates)

- **UI**: Smooth scrolling remains bounded by **rows per page** (≤500) × row height × overscan, not total tenants.
- **API/DB**: Listing `limit=500` requires indexes supporting `WHERE` + `ORDER BY` on common sorts (`createdAt`, `email`, `name`). Monitor slow-query logs at high tenant counts.

## Security notes

- Virtualization is **presentational** — RBAC, tenant scope, and audit logging remain on the **server** (`admin` routes + capabilities).
- Bulk and sensitive actions still use **confirmations** and server enforcement.
- Stress route is **dev-only** and **SUPER_ADMIN-gated** to avoid accidental load in production builds.

## Remaining bottlenecks / future work

1. **Cursor-based pagination** for “load more” without jumping pages (optional product direction).
2. **Column resize / persistence** (localStorage) if product requires fixed table columns.
3. **True infinite scroll** + **parallel prefetch** of next page (TanStack Query).
4. **Server-side composite index** review when `search` + `sort` combinations appear in slow logs.
