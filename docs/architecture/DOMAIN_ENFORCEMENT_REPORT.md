# Domain + workflow enforcement report

**Scan date:** 2026-05-06 (full pass).  
**Rules:** `.cursor/rules/domain-classification.mdc`, `docs/architecture/DOMAIN_AUDIT.md`.

## 1. Violation table (production issues)

| ID | File | Issue | Severity |
|----|------|--------|----------|
| — | — | **No open cross-domain route violations** after this pass | — |

All appointment **writes** (`create`, `update` with overlap, `delete`, lifecycle status, reminder flags) go through `server/src/domains/workflow/appointmentWorkflowService.ts`.

## 2. Architectural debt (explicit, acceptable)

| ID | Area | Note |
|----|------|------|
| DEBT-PV-01 | `routes/patientPortal.ts` | OTP, profile update, invoice **reads** still use Prisma in-route — identity/finance **reads** are not workflow concerns; extracting to `services/patientPortal*` is optional. |
| DEBT-FIN-01 | `routes/invoices.ts` | Uses `clinicalRbac` middleware — **authorization** cross-cut, not invoice math inside clinical routes. |
| DEBT-COMM-01 | `routes/communication.ts` | Orchestrates SMS/email + calls `workflowMarkReminderSent` — correct layering. |

## 3. Files changed (this enforcement pass)

- `server/src/domains/workflow/appointmentWorkflowService.ts` — added `workflowSetAppointmentStatus`, `workflowDeleteAppointment`, `workflowMarkReminderSent`.
- `server/src/domains/workflow/index.ts` — re-exports new workflow APIs.
- `server/src/routes/appointments.ts` — cancel / complete / confirm / delete use workflow helpers.
- `server/src/routes/patientPortal.ts` — cancel uses `workflowSetAppointmentStatus`.
- `server/src/routes/communication.ts` — reminder flags via `workflowMarkReminderSent`.
- `server/src/services/platformSaasBillingHints.ts` — renamed from `billingHints.ts` (SaaS naming clarity).
- `server/src/routes/platformSaasBilling.ts` — import path update.

## 4. Refactor summary by domain

| Domain | Change |
|--------|--------|
| **Workflow** | Sole writer for `Appointment` rows (including reminders metadata). |
| **Clinical** | No invoice payloads on patient routes (prior pass). |
| **Finance** | Patient AR vs SaaS hints naming clarified (`platformSaasBillingHints`). |
| **Retail** | Unchanged — no clinical coupling. |
| **Infrastructure** | N/A — middleware unchanged. |

## 5. Validation commands

```bash
cd server && npx tsc --noEmit
cd .. && npx tsc --noEmit
```

## 6. Confirmation

**DOMAIN + WORKFLOW ENFORCEMENT COMPLETE** for in-scope appointment mutation paths and SaaS billing hint naming. Remaining items are **DEBT-* only** (portal read/write decomposition, RBAC naming).
