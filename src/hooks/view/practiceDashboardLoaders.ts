import api from '@/api';
import { createPracticeListRegistry } from '@/lib/dashboardFetchRegistry';
import { dashboardAggregatesParallel, dashboardEntityListPromiseAll } from '@/lib/dashboardPromiseAll';
import { isApiHttpError } from '@/lib/apiErrors';
import { validateDashboardLoaderContract } from '@/lib/validateDashboardLoaderContract';
import type {
  DashboardAppointmentChartPoint,
  DashboardRevenueChartPoint,
  DashboardStatsPayload,
} from '@/types/dashboardApi';

type PatientsListPayload = Awaited<ReturnType<typeof api.patients.list>>;
type AppointmentsListPayload = Awaited<ReturnType<typeof api.appointments.list>>;
type PrescriptionsListPayload = Awaited<ReturnType<typeof api.prescriptions.list>>;
type InvoicesListPayload = Awaited<ReturnType<typeof api.invoices.list>>;
type LabListPayload = Awaited<ReturnType<typeof api.lab.list>>;
type RecentPatientsPayload = Awaited<ReturnType<typeof api.dashboard.recentPatients>>;

function describeError(e: unknown): string {
  if (isApiHttpError(e)) return `HTTP ${e.status} — ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

function nullOnError<T>(label: string): (e: unknown) => T | null {
  return (e: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(`[dashboardLoader] ${label} rejected: ${describeError(e)} (null fallback)`);
    }
    return null;
  };
}

export interface PracticeListsLoadResult {
  patients: PatientsListPayload['patients'];
  appointments: AppointmentsListPayload;
  prescriptions: PrescriptionsListPayload['prescriptions'];
  invoices: InvoicesListPayload['invoices'];
  labOrders: LabListPayload['labOrders'];
}

/** API uses `invoices` (not `items`); matches {@link coreApiInvoicesList} response shape. */
const EMPTY_INVOICES_LIST: InvoicesListPayload = { invoices: [], total: 0, page: 1, limit: 500 };
const EMPTY_LAB_LIST: LabListPayload = { labOrders: [], total: 0, page: 1, limit: 500 };

/**
 * Parallel entity lists (transport shapes from api) — map to view models in the bundle hook.
 *
 * Core EMR calls (patients, appointments, prescriptions) are required: failures surface as load errors.
 * Feature-gated billing/lab lists use {@link safeFeatureCall} (via registry) so subscription / product gates
 * (`FEATURE_DISABLED` / HTTP 402) never take down the whole dashboard.
 */
export async function loadPracticeLists(): Promise<PracticeListsLoadResult> {
  const reg = createPracticeListRegistry();
  reg.registerCoreFetch('patients', () => api.patients.list({ limit: 500 }));
  reg.registerCoreFetch('appointments', () => api.appointments.list());
  reg.registerCoreFetch('prescriptions', () => api.prescriptions.list({ page: 1, limit: 500 }));
  reg.registerOptionalFetch('invoices', () => api.invoices.list({ page: 1, limit: 500 }), EMPTY_INVOICES_LIST);
  reg.registerOptionalFetch('lab', () => api.lab.list({ page: 1, limit: 500 }), EMPTY_LAB_LIST);

  const { core, optional } = reg.getMaps();
  validateDashboardLoaderContract({
    coreKeys: Array.from(core.keys()),
    optionalKeys: Array.from(optional.keys()),
    coreFactories: core,
    optionalFactories: optional,
  });

  return dashboardEntityListPromiseAll(core, optional);
}

export interface DashboardAggregatesLoadResult {
  dashboardApiStats: DashboardStatsPayload | null;
  dashboardRecentPatients: RecentPatientsPayload | null;
  dashboardRevenueChart: DashboardRevenueChartPoint[];
  dashboardAppointmentChart: DashboardAppointmentChartPoint[];
}

/** Dashboard stats + chart series — map to view models in the bundle hook. */
export async function loadDashboardAggregates(): Promise<DashboardAggregatesLoadResult> {
  const [dashStats, dashRecent, revC, apptC] = await dashboardAggregatesParallel([
    api.dashboard.stats().catch(nullOnError<DashboardStatsPayload>('dashboard.stats')),
    api.dashboard.recentPatients().catch(nullOnError<RecentPatientsPayload>('dashboard.recentPatients')),
    api.dashboard
      .revenueChart('daily')
      .catch(nullOnError<DashboardRevenueChartPoint[]>('dashboard.revenueChart')),
    api.dashboard
      .appointmentChart()
      .catch(nullOnError<DashboardAppointmentChartPoint[]>('dashboard.appointmentChart')),
  ]);
  return {
    dashboardApiStats: dashStats && typeof dashStats === 'object' ? dashStats : null,
    dashboardRecentPatients: Array.isArray(dashRecent) ? dashRecent : null,
    dashboardRevenueChart: Array.isArray(revC) ? revC : [],
    dashboardAppointmentChart: Array.isArray(apptC) ? apptC : [],
  };
}
