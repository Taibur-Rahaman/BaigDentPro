# Workflow domain (documentation anchor)

Appointment lifecycle + overlap rules: `server/src/domains/workflow/index.ts` and `appointmentWorkflowService.ts` → `/api/appointments`.

Orchestration lives in route handlers + `server/src/services/appointmentConflictService.ts` — no separate workflow store yet.
