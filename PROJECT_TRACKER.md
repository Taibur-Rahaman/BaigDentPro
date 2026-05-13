# BaigDentPro — Project tracker (single source of truth)

**Last updated:** 2026-05-06

**Legend:** `[x]` done · `[ ]` not done · `❗` shipped/incomplete or product gap (stub, 501, or misleading vs promise)

---

## Reference

| Doc | Purpose |
|-----|---------|
| **`FEATURES_AND_CONNECTIONS.md`** | Feature matrix + wiring (maintain when shipping) |
| **`ERRORS_AND_LIMITATIONS.md`** | Resolved vs open gaps, env blockers |
| **`SYSTEM_FEATURE_CONNECTIONS.md`** | Router + QA notes (`GET /api/health`) |
| **`qa-api-results.json`** | API probe (`scripts/qa-api-probe.mjs`) — roles: `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `TENANT` |
| **`qa-ui-results.json`** | UI crawl (`scripts/qa-ui-crawl.mjs`) |
| **`UNSOLVED_ERRORS_REPORT.md`** | Automation gaps (PDF, upload, third-party creds) |

All API paths below use prefix **`/api`**.

---

## Feature status (live)

_Scan: `server/src/createApp.ts` mounts + `SYSTEM_FEATURE_CONNECTIONS.md` master table. QA: `qa-api-results.json`, `qa-ui-results.json`._

### Authentication

* [x] Login (`POST /api/auth/login`)
* [x] Refresh token (`POST /api/auth/refresh`)
* [x] Role-based access (API + SPA gates)
* [x] Supabase recovery + Prisma password sync
* [ ] Password reset UI polish

### Patient management

* [x] Patient CRUD (`/api/patients`)
* [x] Medical history
* [x] Treatment plans & records
* [x] File upload (`POST /api/upload`)
* [x] Patient timeline **API** (`GET /api/patients/:id/timeline`, `api.patients.timeline`)
* [ ] Advanced patient timeline **UI** (consume timeline endpoint)

### Appointment system

* [x] Full CRUD (`/api/appointments`)
* [x] Calendar / operations UI
* [x] Status tracking (`Appointment.status`)
* [ ] No-show explicit status/model (use status string or migration — open)
* [ ] Smart scheduling (productized; helpers exist under `src/lib/core/ai`)

### Clinical

* [x] Treatment records
* [x] Prescription API (`/api/prescriptions`) — **RECEPTIONIST denied by RBAC** (QA `403`; by design)
* [x] Dental chart API (`PUT …/dental-chart`)
* ❗ Odontogram UI (visual) — API present; chart UX incomplete
* ❗ Imaging viewer UI — upload exists; dedicated viewer not done

### Billing & finance

* [x] Invoices & PDF routes
* [x] Invoice payments — **CASH recording only** (online gateways removed)
* [x] Revenue dashboard (`/api/dashboard/*`)
* ❗ Insurance claims — **placeholder page** (`/dashboard/insurance`, `ProductModulePlaceholder`)
* [ ] Due tracking improvements (beyond dashboard pending fields)

### Dashboard

* [x] Stats API (`/api/dashboard/*`)
* [x] Revenue charts
* [x] Doctor performance
* [ ] Advanced / predictive analytics

### Communication

* [x] SMS/email routes & logs (`/api/communication/*`)
* [x] Reminder fields on appointments (`reminderSent`, `reminderSentAt`)
* [ ] Production SMS automation (Twilio/env)
* [ ] Production email delivery (SMTP/transporter)
* [x] Communication hub **page** — SMS + email **log tables** (`CommunicationHubPage`)

### Admin

* [x] User management
* [x] Roles & permissions (route + gate level)
* [x] Audit / activity logs
* [x] Clinic settings
* [x] Super-admin **subscription payments** queue (`/dashboard/admin/subscription-payments`, `PATCH` status → PAID applies plan)
* [ ] Fine-grained RBAC (per-resource policies)

### Advanced

* [x] Multi-branch (`/api/clinic/*`, `/network/*`)
* [x] Lab module (`/api/lab/*`)
* [x] SaaS billing — **manual WhatsApp** (`POST /api/payment/manual/initiate`, `config/payment.ts`, `ADMIN_WHATSAPP_NUMBER`)
* [x] Inventory **route** (`/dashboard/inventory`)
* ❗ Inventory **system** — stub UI + no stock logic (`ClinicInventoryPage`)
* ❗ Staff schedule & clinic control & patient-portal **settings** dashboard cards — **stub** (`StaffSchedulePage`, `ClinicControlPanelPage`, `PatientPortalSettingsPage`)

### AI features

* [x] Core AI modules (`src/lib/core/ai/*`)
* [ ] Chatbot booking UI
* [ ] Predictive analytics UI

---

## Error tracking

_Data from latest `qa-api-results.json` + `qa-ui-results.json` (committed snapshot)._

### Critical

* [ ] _None in latest API probe — **no HTTP 5xx** across SUPER_ADMIN, CLINIC_ADMIN, DOCTOR, RECEPTIONIST, TENANT._
* [ ] Production-only risks: DB down, missing SMS/email provider secrets → outbound messaging fails (not shown in JSON).

### Medium

* [ ] **UI harness limits** (`qa-ui-results.json`): `clicked: 0` on button crawl — does not prove controls broken; misses icon/non-`<button>` actions.
* [ ] **Receptionist ↔ prescriptions nav**: sidebar includes prescriptions URL; **`GET /api/prescriptions` → 403`** for RECEPTIONIST — intentional RBAC; confirm SPA handles empty/error gracefully (avoid “broken” UX).

### Minor

* [ ] UI polish (password reset, odontogram, viewers).

### QA “failures” that are **not** bugs

| Probe | Role | Status | Reason |
|-------|------|--------|--------|
| `/prescriptions` | RECEPTIONIST | 403 | `requirePrescriptionsEmrAccess` |
| `/products`, `/orders` | RECEPTIONIST | 403 | Tenant catalog / EMR firewall — expected |
| `/shop/admin/products`, `/shop/admin/orders` | TENANT | 403 | Shop admin restricted to admin-capable roles |

### Latest UI crawl (snapshot)

* **Role exercised:** RECEPTIONIST (only entry in file).
* **Visited routes:** all `ok: true`; **`consoleErrors` / `pageErrors` / `failedRequests`: empty.**

---

## Roadmap progress

### Phase 1 — Fix & stabilize

* [x] Core auth + refresh + `/api/health` + CORS ordering (`ERRORS_AND_LIMITATIONS.md` resolved)
* [x] **2026-05-06:** QA JSON reviewed — no 5xx; 403s classified as RBAC
* [ ] Re-run probes after each major merge; fail CI only on **unexpected** 4xx/5xx
* [ ] Define **NO_SHOW** (status convention or schema)
* [ ] Close receptionist prescriptions UX if RBAC stays (hide route or friendly empty state)

### Phase 2 — Core completion

* [ ] Odontogram UI
* [ ] Replace insurance **placeholder**
* [x] Communication hub UI (log viewer)
* [ ] Inventory logic + real UI

### Phase 3 — Advanced

* [ ] AI chatbot booking
* [ ] Smart scheduling (product)
* [ ] Predictive analytics

---

## Daily update log

### 2026-05-06 (payment & QA engineering pass)

* **Payment policy locked:** `/config/payment.ts`; SaaS checkout is **`POST /api/payment/manual/initiate`** → WhatsApp deep link; **`stripe` removed** from server + client deps; invoice **`POST .../payments`** accepts **CASH** only.
* **UI:** `/dashboard/subscription` Stripe UI removed; **`CommunicationHubPage`** now lists SMS/email logs.
* **QA:** `scripts/qa-api-probe.mjs` extended — manual initiate (CLINIC_ADMIN), Rx PDF when rows exist (DOCTOR), multipart upload (TENANT).
* **Docs:** `SYSTEM_FEATURE_CONNECTIONS.md`, `docs/ROADMAP.md`, `FEATURES_*`, `ERRORS_*`, this tracker aligned.

---

## Summary (2026-05-06 — engineering refresh)

### What improved

* **WhatsApp-only SaaS billing** end-to-end vs Stripe/MFS; admin settlement UI already on **`/dashboard/admin/subscription-payments`**.
* **Communication hub** graduated from scaffold to **live log viewer**.
* **QA probe** covers PDF (conditional), upload fixture, manual payment POST.
* **Documentation drift** reduced (`GET /api/health`, roadmap JWT + payments).

### What is still broken / incomplete

* **Stubs:** insurance, inventory system UI, staff schedule, clinic control panel, patient portal settings card.
* **Clinical UX:** odontogram + imaging viewer depth.
* **Outbound messaging:** Twilio/SMTP still env-dependent for SMS/email sends (logs UI works regardless).

### Top 5 next tasks

1. **Insurance** module or hide route until MVP exists.
2. **Inventory** schema + real UI (replace placeholder).
3. **Receptionist ↔ prescriptions** UX alignment with Rx API RBAC.
4. Run **`node scripts/qa-api-probe.mjs`** against a live API and commit fresh **`qa-api-results.json`**.
5. **Staff schedule / clinic control / portal settings** — spec + implement or deprioritize in nav.
