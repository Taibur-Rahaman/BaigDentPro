import api from '@/api';
import { isApiHttpError } from '@/lib/apiErrors';
import { safeFeatureCall } from '@/lib/safeFeatureCall';
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

function unwrapSettled<T>(result: PromiseSettledResult<T>): T {
  if (result.status === 'rejected') {
    throw result.reason;
  }
  return result.value;
}

/** API uses `invoices` (not `items`); matches {@link coreApiInvoicesList} response shape. */
const EMPTY_INVOICES_LIST: InvoicesListPayload = { invoices: [], total: 0, page: 1, limit: 500 };
const EMPTY_LAB_LIST: LabListPayload = { labOrders: [], total: 0, page: 1, limit: 500 };

/**
 * Parallel entity lists (transport shapes from api) — map to view models in the bundle hook.
 *
 * Core EMR calls (patients, appointments, prescriptions) are required: failures surface as load errors.
 * Feature-gated billing/lab lists use {@link safeFeatureCall} so subscription / product gates
 * (`FEATURE_DISABLED` / HTTP 402) never take down the whole dashboard.
 */
export async function loadPracticeLists(): Promise<PracticeListsLoadResult> {
  const settled = await Promise.allSettled([
    api.patients.list({ limit: 500 }),
    api.appointments.list(),
    api.prescriptions.list({ page: 1, limit: 500 }),
    safeFeatureCall(() => api.invoices.list({ page: 1, limit: 500 }), EMPTY_INVOICES_LIST),
    safeFeatureCall(() => api.lab.list({ page: 1, limit: 500 }), EMPTY_LAB_LIST),
  ]);

  const patientsRes = unwrapSettled(settled[0]);
  const appointmentsRes = unwrapSettled(settled[1]);
  const prescriptionsRes = unwrapSettled(settled[2]);
  const invoicesRes = unwrapSettled(settled[3]);
  const labRes = unwrapSettled(settled[4]);

  return {
    patients: patientsRes.patients,
    appointments: appointmentsRes,
    prescriptions: prescriptionsRes.prescriptions,
    invoices: invoicesRes.invoices,
    labOrders: labRes.labOrders,
  };
}

export interface DashboardAggregatesLoadResult {
  dashboardApiStats: DashboardStatsPayload | null;
  dashboardRecentPatients: RecentPatientsPayload | null;
  dashboardRevenueChart: DashboardRevenueChartPoint[];
  dashboardAppointmentChart: DashboardAppointmentChartPoint[];
}

/** Dashboard stats + chart series — map to view models in the bundle hook. */
export async function loadDashboardAggregates(): Promise<DashboardAggregatesLoadResult> {
  const [dashStats, dashRecent, revC, apptC] = await Promise.all([
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
