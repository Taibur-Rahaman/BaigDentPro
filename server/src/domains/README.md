# Domain layout (`server/src/domains`)

Business routers are grouped **without changing HTTP paths**.

| Folder | Role |
|--------|------|
| `clinical/` | Patients, prescriptions, lab |
| `finance/` | Patient AR (`invoices`) + platform SaaS billing (`platformSaasBilling`, subscription, manual payment) — separate barrels, no cross-import |
| `retail/` | Shop, tenant products, orders |
| `workflow/` | Appointments + `appointmentWorkflowService` (overlap validation) |
| `infrastructure/` | Notes only — middleware/DB live elsewhere |

Barrels export routers only; workflow logic lives in `workflow/appointmentWorkflowService.ts`.
