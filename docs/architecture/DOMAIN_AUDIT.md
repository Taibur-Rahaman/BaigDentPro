# Domain classification audit (BaigDentPro)

Rule source: `.cursor/rules/domain-classification.mdc`.

## Resolved in refactor (2026-05-06)

| Issue | Resolution |
|-------|------------|
| Clinical `GET /patients/:id` bundled invoices | **Removed** — load invoices via `GET /api/invoices?patientId=` (SPA already keeps a clinic invoice list). |
| Patient list `_count.invoices` | **Removed** from patients API. |
| Portal booking skipped overlap | **Fixed** — `POST /api/patient-portal/appointments` uses `workflowCreateAppointment` + `assertNoAppointmentOverlap`. |
| Staff appointment create/update duplicated rules | **Unified** — `routes/appointments.ts` delegates to `workflowCreateAppointment` / `workflowUpdateAppointment`. |
| `coreBillingApi` naming | **Renamed** → `corePatientFinanceApi.ts` (patient AR + lab HTTP client). |
| Ambiguous `routes/billing.ts` | **Renamed** → `routes/platformSaasBilling.ts` (mount still `/api/billing/*`). |
| UI “Payment Ledger” copy | **Renamed** → “Treatment payment history” (not accounting ledger). |
| Flat domain barrels | **Replaced** with `server/src/domains/{clinical,finance,retail,workflow,infrastructure}/`. |

## Remaining architectural debt (non-blocking)

| ID | Note |
|----|------|
| DEBT-01 | `routes/invoices.ts` uses `clinicalRbac` middleware — cross-cutting security, not finance domain logic. Acceptable; consider `financeRbac` alias later. |
| DEBT-02 | Appointment `cancel` / `complete` routes still call Prisma directly (no overlap). Low risk. |
| ~~DEBT-03~~ | ~~`billingHints.ts`~~ | **Resolved** → `platformSaasBillingHints.ts`. |
| DEBT-04 | Patient portal assigns portal bookings to `patient.userId` (registered doctor). Product may want explicit doctor picker later. |

## Domain route map (HTTP unchanged)

| Domain | Mount |
|--------|--------|
| Clinical | `/api/patients`, `/api/prescriptions`, `/api/lab` |
| Finance (patient AR) | `/api/invoices` |
| Platform SaaS finance | `/api/billing`, `/api/subscription`, `/api/payment`, `/api/admin/subscription-payments` |
| Retail | `/api/shop`, `/api/products`, `/api/orders` |
| Workflow | `/api/appointments` (+ shared `appointmentWorkflowService`) |
