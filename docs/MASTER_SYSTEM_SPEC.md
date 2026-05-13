# BaigDentPro — Master System Spec (unified, codebase-truth 2026-05-06)

**Authority:** This document supersedes scattered markdown when they conflict. **Code + `server/src/createApp.ts` + Prisma schema** win over older marketing copy.

---

## 1. Product features (deduplicated)

| Domain | In scope today | Partial / stub | Not in scope / missing |
|--------|------------------|------------------|-------------------------|
| **Auth** | JWT, refresh, roles, clinic scope, invites, patient portal OTP | Password reset UI polish | SSO, MFA |
| **Clinical** | Patients, medical history, dental chart rows, FDI/Universal grid UI, treatment plans/records, consents, prescriptions, lab | Odontogram depth (no per-surface SVG), imaging viewer | Perio charting, DICOM, clinical state machine (formal) |
| **Workflow** | Appointment CRUD, overlap checks, lifecycle (cancel/complete/confirm), portal book/cancel, reminder flags via workflow service | — | Smart scheduling, waitlist product |
| **Finance (patient AR)** | Invoices, items, CASH payments, reconciliation hooks, PDF | AR aging as first-class, refunds, installments | Insurance EDI 837/835, fee schedules |
| **Platform SaaS finance** | Manual WhatsApp subscription flow, `SubscriptionPayment`, admin mark paid, plan apply | — | Card gateway (roadmap) |
| **Retail** | Shop catalog `ShopProduct`, cart, orders, stock | — | Clinical consumables inventory |
| **Comms** | SMS/email/WhatsApp routes, logs, reminder fields | Template UI, full automation | — |
| **Admin** | Super admin, audit logs, branches, subscription payments | Field-level RBAC | — |
| **Patient portal** | OTP, profile, appointments, book/cancel (workflow), invoice list (read) | Rich self-scheduling rules | — |
| **Reporting** | Dashboard stats, charts, CSV-style reports | Predictive analytics | — |

---

## 2. Roadmap (from `docs/ROADMAP.md` + tracker, merged)

- SaaS: **manual WhatsApp only** for subscriptions; no Stripe in active path (policy: `config/paymentPolicy.ts`).
- Clinic AR: **CASH invoice payments** on `/api/invoices/.../payments` (no online wallet in current policy).
- Future: CAPTCHA, WAF, HIPAA legal review, optional gateways.

---

## 3. Architecture rules (unified)

- **Domains:** Clinical, Finance (patient AR), Platform SaaS finance, Retail, Workflow, Infrastructure (middleware/DB/audit).
- **Rules:** See `.cursor/rules/domain-classification.mdc` — shop stock ≠ clinical inventory; patient treatment payment history ≠ GL.
- **Workflow:** All **`Appointment` mutations** (including status changes, delete, reminder metadata) go through `server/src/domains/workflow/appointmentWorkflowService.ts`.
- **Patient GET:** No nested invoices on `/api/patients/:id` — finance reads via `/api/invoices` or **`GET /api/patients/:id/timeline`** (read projection).

---

## 4. Contradictions resolved (latest code wins)

| Old doc claim | Truth |
|---------------|--------|
| `routes/billing.ts` | **`routes/platformSaasBilling.ts`** (mount still `/api/billing`) |
| Stripe webhook for SaaS primary | **Manual WhatsApp** — no Stripe webhook path for subscriptions |
| Portal bypasses overlap | **Fixed** — uses `workflowCreateAppointment` |
| `billingHints.ts` | **`platformSaasBillingHints.ts`** |

---

## 5. Known bugs / debt (living)

- **`docs/ERRORS_AND_LIMITATIONS.md`**, **`docs/architecture/DOMAIN_AUDIT.md`**, **`docs/architecture/DOMAIN_ENFORCEMENT_REPORT.md`**
- Portal OTP/profile still Prisma-in-route (DEBT-PV-01).
- Insurance claims page placeholder.
- Clinic inventory stub.

---

## 6. Missing features (competitive / DPMS parity)

See **`PROJECT_TRACKER.md`** and gap analyses: unified timeline UI, full odontogram, imaging workstation, clinical inventory, insurance, automation, AI — **not** all implemented; this spec tracks **truth**, not promises.

---

## A. Product flows (summary)

**Patient:** Register (staff) → appointments → clinical visits → treatment records / Rx → invoices → payments → follow-up appointments.

**Doctor:** Schedule → patient chart → diagnosis/plan (strings/models today) → procedures/treatment records → Rx/lab.

**Reception:** Scheduling, reminders (SMS routes), patient intake.

**Finance:** Invoice → CASH payment recording → dashboard revenue (no full GL).

---

## B. Architecture flow

**SPA** → `src/lib/core/*` / `api.ts` → **Express** `/api/*` → **domain routes** (`server/src/domains/*/`) → **services** / **workflow** → **Prisma** → Postgres.

**Workflow path:** HTTP → `routes/appointments.ts` or portal → **`appointmentWorkflowService`** → Prisma `Appointment`.

---

## C. State lifecycles (current model)

- **Appointment:** `SCHEDULED` | `CONFIRMED` | `COMPLETED` | `CANCELLED` (+ overlap rules on time-changing updates).
- **Treatment:** `TreatmentPlan.status` string; `TreatmentRecord` financial columns per visit row — **no** formal clinical state machine enum yet.
- **Payment:** `Payment` on invoice; `paymentStatus` / `reconciliationStatus` on rows — **no** installment entity.

---

## D. Gap matrix (truth mode)

| Gap | Severity |
|-----|----------|
| Formal clinical + treatment state machine | **CRITICAL** (DPMS parity) |
| Full odontogram + imaging | **CRITICAL** |
| Unified timeline **UI** | **HIGH** (API: `GET /patients/:id/timeline`) |
| GL / AR aging / refunds | **HIGH** |
| Clinical inventory | **HIGH** |
| Comms automation | **MEDIUM** |
| AI / optimization | **LOW**–**MEDIUM** |

---

## E. Build pipeline order (strict)

1. Workflow engine completion (clinical transitions — extend beyond appointments).  
2. Clinical state machine (schema + API).  
3. Appointment intelligence (after core state).  
4. Patient timeline **UI** consuming timeline API.  
5. Finance ledger separation.  
6. Odontogram.  
7. Imaging.  
8. Clinical inventory.  
9. Comms automation.  
10. AI last.

---

*End of master spec — update when shipping major features.*
