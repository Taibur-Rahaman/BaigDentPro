/**
 * View-layer types for workspace / admin payloads still sourced from `api`.
 * List row shapes for patients, appointments, prescriptions, invoices, and lab live in
 * [`viewModels.ts`](./viewModels.ts) — do not re-expose domain DTO names here.
 */
import type api from '@/api';

type Api = typeof api;

export type WorkspaceBundle = Awaited<ReturnType<Api['patients']['workspaceHydration']>>;
export type MedHistoryVM = WorkspaceBundle['medicalHistory'];
export type TreatmentPlanVM = WorkspaceBundle['treatmentPlans'][number];
export type TreatmentRecordVM = WorkspaceBundle['treatmentRecords'][number];
export type ConsentVM = NonNullable<WorkspaceBundle['consent']>;

export type SuperAdminStats = Awaited<ReturnType<Api['superAdmin']['stats']>>;
