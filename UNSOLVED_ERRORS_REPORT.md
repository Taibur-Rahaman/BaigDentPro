# Unsolved Errors Report

Issues observed during automated QA that **were not fully resolved** or **could not be exercised** in this environment without external credentials or destructive data mutations.

Classification: **CRITICAL** | **MAJOR** | **MINOR**.

---

## 1. End-to-end print / PDF flows not executed

| Field | Detail |
|-------|--------|
| **Severity** | MINOR |
| **Error name** | Prescription / invoice PDF generation not validated with real IDs |
| **Where** | `GET /api/prescriptions/:id/pdf`, `GET /api/invoices/:id/pdf`; UI print actions on billing / prescriptions |
| **Steps to reproduce** | Seed DB has zero prescriptions for the doctor probe user (`GET /api/prescriptions` returned `[]`). Attempt PDF without id fails by definition. |
| **Expected vs actual** | Expected: open existing Rx → PDF returns `200` `application/pdf`. Actual: no seeded Rx rows to drive the route in automation. |
| **Possible root cause** | Demo seed creates patients but not prescriptions/invoices with PDF-ready payloads. |
| **Why not fixed** | Adding prescriptions would require valid FK graph (patient, items, clinic scope) and optional SMTP for “send” flows; out of scope for a non-destructive QA pass. |

---

## 2. Multipart upload not verified

| Field | Detail |
|-------|--------|
| **Severity** | MINOR |
| **Error name** | Binary `POST /api/upload` not exercised |
| **Where** | `server/src/routes/upload.ts`; clinic/profile/branding pickers in UI |
| **Steps to reproduce** | Automation used navigation + GET probes only; no test image POST body was sent. |
| **Expected vs actual** | Expected: `200` JSON with stored URL in dev storage. Actual: not invoked. |
| **Possible root cause** | Harness lacked multipart fixtures and storage backend (Supabase bucket) may be unset locally. |
| **Why not fixed** | Requires choosing safe dummy bytes + confirming storage credentials without polluting production buckets. |

---

## 3. External billing / messaging integrations not validated

| Field | Detail |
|-------|--------|
| **Severity** | MAJOR (for production go-live); **MINOR** for local QA parity |
| **Error name** | Stripe checkout/webhooks, Twilio SMS, SMTP email, WhatsApp sends not exercised |
| **Where** | `/api/payment/*`, `/api/billing/*`, `/api/communication/*` |
| **Steps to reproduce** | Call provider-backed routes without configured API keys / webhooks. |
| **Expected vs actual** | Expected: provider success or controlled 4xx from validation. Actual: not executed (missing secrets / external callbacks). |
| **Possible root cause** | Environment variables for third-party services not provisioned in QA `.env`. |
| **Why not fixed** | Needs real or sandbox credentials and safe webhook tunneling; cannot mock credibly inside repo without stubs. |

---

## 4. UI automation coverage gaps for interactive controls

| Field | Detail |
|-------|--------|
| **Severity** | MINOR |
| **Error name** | Not every interactive control registered as `<button>` / `.neo-btn:not(a)` |
| **Where** | Practice workspace tables, modals, icon-only controls |
| **Steps to reproduce** | Run `scripts/qa-ui-crawl.mjs` — several routes report `clicked: 0` while pages render. |
| **Expected vs actual** | Expected: every actionable control receives a click attempt. Actual: harness skips `<a>` styled buttons and non-standard widgets. |
| **Possible root cause** | DOM patterns vary (`<div onClick>`, icon buttons, links). |
| **Why not fixed** | Expanding selectors risks navigating away or triggering destructive modals; would need page-specific scenarios. |

---

## 5. Local Docker database path not verified on this host

| Field | Detail |
|-------|--------|
| **Severity** | MINOR |
| **Error name** | Docker daemon unreachable (`Cannot connect to the Docker daemon`) |
| **Where** | `docker compose up -d` |
| **Steps to reproduce** | Run compose without Docker Desktop / daemon running. |
| **Expected vs actual** | Expected: Postgres container healthy. Actual: command failed; QA continued against configured remote `DATABASE_URL`. |
| **Possible root cause** | Host Docker service stopped or unavailable in CI sandbox. |
| **Why not fixed** | Environmental; operator must start Docker or use hosted Postgres (as here). |

---

## 6. Optional Supabase Auth sync not exercised

| Field | Detail |
|-------|--------|
| **Severity** | MINOR |
| **Error name** | Seed logs: Supabase Auth sync skipped |
| **Where** | `server/src/seed.ts` |
| **Steps to reproduce** | Run `db:seed` without `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. |
| **Expected vs actual** | Expected: seeded users mirrored to Supabase Auth when configured. Actual: Prisma-only passwords per seed output. |
| **Possible root cause** | Env keys intentionally omitted for local/dev. |
| **Why not fixed** | Requires project secrets; not appropriate to embed in repo. |
