# Frontend API and authentication architecture

This document matches `.cursor/rules/frontend-architecture.mcp.txt` and CI (`.github/workflows/architecture-check.yml`).

## Layout (`src/lib/core/`)

| Module | Responsibility |
|--------|----------------|
| `coreHttpClient.ts` | **Only** `fetch()`; timeouts; `buildAuthHeaders`; 401 → refresh → single retry; `coreApiRequest` |
| `coreAuthStorage.ts` | Canonical `localStorage` keys: `baigdentpro:accessToken`, `refreshToken`, `sessionId`, `user` |
| `coreAuthApi.ts` | Auth flows, `/auth/me` envelope handling, login/register/logout/refresh |
| `core*Api.ts` (patients, billing, admin, shop, …) | Domain calls via `coreApiRequest` + normalization for that domain |
| `index.ts` | Public aggregate of exports |

**`src/lib/coreApiClient.ts`** — thin compatibility entry: `export *` from `@/lib/core` so `@/lib/coreApiClient` stays a stable path for the façade and barrel.

**App code** must use **`@/api`** or **`@/lib/apiClient`**. Do not import `@/lib/core/...` from pages, hooks, or services (keeps domain boundaries and tooling honest).

## Canonical authority

- **Transport:** `coreHttpClient.ts` only (CI blocks `fetch(` elsewhere).
- **Canonical auth keys:** `coreAuthStorage.ts` only (CI allows literals there).
- **Response shaping:** appropriate `core*Api.ts` module (or `coreAuthApi` for auth envelopes).

## Import layering

Only **`src/api.ts`** and **`src/lib/apiClient.ts`** may import from **`@/lib/coreApiClient`**.

**Services, hooks, pages, contexts** use **`@/api`** or **`@/lib/apiClient`** — not `@/lib/core/*`.

## Barrel (`apiClient.ts`)

Narrow re-export surface for bootstrap and helpers. Prefer adding new behavior in `src/lib/core/` and exporting via `core/index.ts`, then the barrel, rather than new ad-hoc HTTP.

## Facade (`src/api.ts`)

Delegation and wiring only: parameters, `CoreApiOptions` mapping, query strings, and attaching `coreApi*` functions. No runtime branching on API bodies, no token persistence, no refresh orchestration in the façade.

## Storage

| Key | Owner |
|-----|--------|
| `baigdentpro:accessToken` | `coreAuthStorage.ts` |
| `baigdentpro:refreshToken` | `coreAuthStorage.ts` |
| `baigdentpro:sessionId` | `coreAuthStorage.ts` |
| `baigdentpro:user` | `coreAuthStorage.ts` |

**Exceptions:** Supabase session in `supabaseClient.ts`; non-auth UI keys elsewhere as allowed in rules.

## Transport

- No `fetch` under `src/` outside **`coreHttpClient.ts`**.
- No `axios` / `XMLHttpRequest` under `src/`.

## Enforcement

CI checks import layering for `@/lib/coreApiClient`; **no `@/lib/core/…` or `@/lib/core` imports** outside `src/lib/core/` and the `coreApiClient.ts` barrel re-export; stray `fetch`, fetch aliases, canonical key literals (allowed file: `coreAuthStorage.ts`); `api.ts` façade heuristics; and related patterns. See the workflow file for the exact list.

If a change is ambiguous, treat it as a violation until it is clearly delegated through the core layer.
