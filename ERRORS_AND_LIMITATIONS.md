# BaigDentPro — Errors, limitations & QA gaps

**Last updated:** 2026-05-06 · **Sources:** codebase review, `qa-api-results.json`, `UNSOLVED_ERRORS_REPORT.md`, `docs/ROADMAP.md`

This document lists **ongoing limitations** and **environment/QA gaps**. Items removed from earlier reports because they are **fixed in current code** are listed under “Resolved”.

---

## Resolved (no longer tracked as open defects)

| Topic | Resolution (current code) |
|-------|---------------------------|
| Browser `/api/health` blocked by CORS | `GET /api/health` is registered **after** `cors()` in `server/src/createApp.ts` |
| Aggressive rate limits breaking QA | Non-production defaults raised for `/api` and `/api/auth` limits in `createApp.ts` |
| “Single JWT only” / no refresh | **Outdated concern:** `POST /auth/refresh`, `RefreshToken` model, and client refresh flow exist (`server/src/routes/auth.ts`) |
| Stripe subscription checkout / webhook | **Removed:** server no longer depends on `stripe`; **`POST /api/payment/manual/initiate`** + admin **`/api/admin/subscription-payments`** |
| Communication hub only scaffold | **Fixed:** `/dashboard/communication` reads **`/api/communication/*/logs`** |

---

## Product limitations (by design or incomplete scope)

### ❌ Not implemented

| Item | Detail |
|------|--------|
| **Insurance claims product** | `/dashboard/insurance` is still a **placeholder** (`InsuranceClaimsPage` → `ProductModulePlaceholder`). |

### ⚠️ Partial / stub UI (backend may exist)

| Surface | Backend | UI |
|---------|---------|-----|
| Inventory | May share broader clinic data patterns | **Stub** (`ClinicInventoryPage`) |
| Staff schedule | Appointments/users exist | **Stub** (`StaffSchedulePage`) |
| Clinic control panel | Settings/clinic APIs exist | **Stub** (`ClinicControlPanelPage`) |
| Patient portal admin card | Patient portal APIs exist | **Stub** (`PatientPortalSettingsPage`) |

### ⚠️ RBAC — looks like “errors” in QA probes

| Symptom | Explanation |
|---------|-------------|
| `GET /api/prescriptions` → **403** for `RECEPTIONIST` | **By design:** `requirePrescriptionsEmrAccess` blocks receptionists & lab techs (`server/src/middleware/clinicalRbac.ts`). |
| `GET /api/shop/admin/*` → **403** for `TENANT` | **By design:** shop admin routes require admin-capable roles. |

---

## Environment & integration gaps

These are **not code bugs**; they need credentials, webhooks, or infrastructure.

| Severity | Topic | Notes |
|----------|--------|--------|
| **High** (for go-live) | Twilio, SMTP, outbound WhatsApp business API | SMS/email routes need provider keys; unrelated to SaaS billing (WhatsApp uses `ADMIN_WHATSAPP_NUMBER` + admin verification). |
| **Medium** | Supabase Auth mirror on seed | Seed may skip Supabase user sync without service role env (`server/src/seed.ts`). |
| **Medium** | Docker Postgres locally | Optional; QA can use hosted `DATABASE_URL` instead. |
| **Low** | PDF / invoice parity | `scripts/qa-api-probe.mjs` now probes Rx PDF when rows exist; invoice PDF not separately scripted. |
| **Low** | Upload edge cases | Probe uploads a 1×1 PNG as **TENANT**; complex fixtures optional. |

---

## QA automation limitations

| Issue | Impact |
|-------|--------|
| Playwright crawl misses some controls | Icon-only or `<div onClick>` actions may show `clicked: 0` in `qa-ui-results.json`. |
| Destructive actions skipped | Create/delete flows not fully automated. |

---

## Roadmap-linked gaps (from `docs/ROADMAP.md`)

CAPTCHA, WAF/CDN, formal compliance packaging — **not** turnkey in-repo.

---

## How to re-verify

```bash
# API probe (writes qa-api-results.json)
node scripts/qa-api-probe.mjs

# UI crawl (writes qa-ui-results.json)
node scripts/qa-ui-crawl.mjs
```

Use seeded accounts from `server/.env` / `SYSTEM_FEATURE_CONNECTIONS.md` test account table.
