import api from '@/api';
import { isApiHttpError } from '@/lib/apiErrors';
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

/** Subscription tier / RBAC may return 403 for individual modules; overview must still load. */
function emptyOnForbidden<T>(fallback: T, label: string): (e: unknown) => T {
  return (e: unknown) => {
    if (isApiHttpError(e) && e.status === 403) {
      if (import.meta.env.DEV) {
        console.warn(`[dashboardLoader] ${label} → 403, using empty fallback`);
      }
      return fallback;
    }
    if (import.meta.env.DEV) {
      console.warn(`[dashboardLoader] ${label} rejected: ${describeError(e)}`);
    }
    throw e;
  };
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

/** Parallel entity lists (transport shapes from api) — map to view models in the bundle hook. */
export async function loadPracticeLists(): Promise<PracticeListsLoadResult> {
  const [patientsRes, appointmentsRes, prescriptionsRes, invoicesRes, labRes] = await Promise.all([
    api.patients
      .list({ limit: 500 })
      .catch(emptyOnForbidden({ patients: [], total: 0, page: 1, limit: 500 }, 'patients.list')),
    api.appointments.list().catch(emptyOnForbidden([], 'appointments.list')),
    api.prescriptions
      .list({ page: 1, limit: 500 })
      .catch(emptyOnForbidden({ prescriptions: [], total: 0, page: 1, limit: 500 }, 'prescriptions.list')),
    api.invoices
      .list({ page: 1, limit: 500 })
      .catch(emptyOnForbidden({ invoices: [], total: 0, page: 1, limit: 500 }, 'invoices.list')),
    api.lab
      .list({ page: 1, limit: 500 })
      .catch(emptyOnForbidden({ labOrders: [], total: 0, page: 1, limit: 500 }, 'lab.list')),
  ]);
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
