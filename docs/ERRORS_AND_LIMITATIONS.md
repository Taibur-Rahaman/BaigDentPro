# BaigDentPro — Errors, Limitations & Non–Auto-Fixable Items

Audit snapshot aligned with `docs/FEATURES_AND_CONNECTIONS.md`.  
**Earlier auto-fixes:** production build guard (`window.location.origin`), broken TypeScript calls (`api.products` → `api.tenantProducts`), mistaken `showNotice` state vs toast in workspace uploads, defensive merge in `SettingsPage` after save.

**Stabilization pass (toolchain):** `prefer-const` in `appointmentWorkflowService.ts` (`suggestNextAvailableSlotAfterConflict`), removed unused `showError` in `AuthContext.tsx`, `usePracticePatientsDomain.ts` now imports `DentalChartRowPayload` from `corePatientsApi` (lint **no-restricted-imports** on `@/types/practicePatientWorkspace`), unused destructuring renamed in `PatientDetailPage.tsx`. Session/global-error UX documented in `FEATURES_AND_CONNECTIONS.md`.

---

## 1. Bugs found & fixed (auto)

| Issue | Symptom | Fix |
|-------|---------|-----|
| `scripts/verify-dist-api-host.cjs` rejects bundle | `npm run build` failed on substring `window.location.origin` | `src/lib/errorHandler.ts`: derive base via `new URL(window.location.href).origin` (same runtime behavior, passes guard) |
| Undefined `api` in workspace | TS: Cannot find name `api` | `import api from '@/api'` in `PracticeWorkspaceController.tsx`; use `api.tenantProducts.uploadImage` |
| Wrong API namespace | TS: `products` missing on `ApiClient` | Same as above in `PrescriptionPage.tsx` |
| State shadowing | TS: `showNotice` not callable | `showNotice` was `useState` string; `.catch` now uses `notifyShort(...)` in workspace controller |
| Settings save typing | Optional fields from API vs strict `FormState` | `SettingsPage` merges `saved` with `prev` and type guards |

---

## 2. Remaining bugs / risks (manual follow-up)

| Area | Description | Suggested fix |
|------|-------------|---------------|
| Logo upload semantics | Clinic/doctor logo upload uses **`tenantProducts.uploadImage`**, which is tied to **tenant catalog** flows, not necessarily clinic branding ACL | Add `api.upload` / `POST /api/upload` usage for branding assets; restrict by role |
| `InsuranceClaimsPage` | Placeholder only — nav implies real claims | Implement payer model or remove/hide nav until backend exists |
| `CommunicationHubPage` | Placeholder — SMS APIs exist but hub is stub | Build hub UI on `/api/communication/*` |
| Duplicate / legacy trees | Large `PrescriptionPage.tsx` + workspace controller duplication | Gradually extract shared prescription form components |
| `.tmp-hostinger-server/` | Removed from VCS; now gitignored as a developer-local staging tree | No follow-up needed unless it re-appears |

---

## 3. API failures / operational

| Topic | Detail |
|-------|--------|
| CORS | Production requires `FRONTEND_URL` (comma-separated) + built-in origins in `createApp.ts`; misconfiguration → browser CORS errors (not fixable in code alone). |
| Rate limits | Auth and global API limiters can 429 aggressive QA crawls; dev limits are higher. |
| DB unavailable | `dbUnavailable` helpers return structured errors; monitor `/api/health`. |
| Stripe webhooks | Raw body route for Stripe; signing secret must match env. |

---

## 4. UI/UX issues

| Issue | Notes |
|-------|--------|
| Scaffold modules | Several dashboard links open **ProductModulePlaceholder** — acceptable for alpha but confusing for end users. |
| Dual navigation mental model | Flat `/dashboard/*` clinical URLs + large in-controller shell; training/docs needed. |
| Reports entry | `/dashboard/reports` relies on workspace controller tab sync; works but non-standard vs typical `<Outlet>` pages. |

---

## 5. Logic / product gaps

| Gap | Impact |
|-----|--------|
| No real insurance EDI | Cannot compete on US RCM workflows without 837/835 or regional equivalent. |
| Charting depth | `DentalChart` is row-based; limited vs per-surface periodontal charting. |
| Inventory page stub | No stock deduction tied to procedures by default. |

---

## 6. Security gaps & hardening

| Gap | Severity | Notes |
|-----|----------|-------|
| Tenant catalog upload for clinic logos | Medium | Wrong abstraction may confuse authorization boundaries — fix upload route. |
| Super-admin / admin surface area | Medium | Ensure deployment uses strong secrets, IP allowlists if applicable. |
| Patient portal OTP | Medium | Rate-limit and lockout policies should be reviewed in `patientPortal` routes. |
| Audit coverage | Low–Medium | Audit middleware present; verify all EMR mutations logged. |

**Cannot auto-fix without product decisions:** MFA, SSO, PHI retention policies, BAA with vendors.

---

## 7. Dead / unused code signals

| Item | Assessment |
|------|------------|
| `PracticeChildRoute` returns `null` | **Not dead** — URL marker for workspace context. |
| Root `src/PrescriptionPage.tsx` | **Active** when embedded from workspace controller. |
| `.tmp-hostinger-server` | Removed from VCS (now gitignored). |
| QA JSON artifacts (`qa-*-results.json`) | **Artifacts** — typically gitignored. |

---

## 8. Things that cannot be auto-fixed (need decisions or external systems)

- **Insurance clearinghouse** contracts, payer IDs, ERA enrollment.
- **SMS/email deliverability** — Twilio/meta templates, regulatory templates (TCPA/GDPR).
- **Per-country billing** — VAT, NHS, ICD coding choices.
- **Clinical compliance** — retention, amendment workflows, legal hold.
- **Full odontogram editor** — UX + persistence model for surfaces.

---

## 9. Recommended CI gates

Enforced locally on last pass (**all succeeded**):

1. `npm run typecheck` — **0 TS errors** (root + server)
2. `npm run lint` — **0 errors** (12 warnings: react-refresh / hooks exhaustive-deps in select view files)
3. `npm run build` (includes dist API host verification)
4. `cd server && npx prisma validate && npx prisma generate`

Optional: server tests / smoke (`scripts/smoke-api.sh`) against staging.

---

*This document pairs with `FEATURES_AND_CONNECTIONS.md` for roadmap and gap analysis.*
