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

/** Subscription tier / RBAC may return 403 for individual modules; overview must still load. */
function emptyOnForbidden<T>(fallback: T): (e: unknown) => T {
  return (e: unknown) => {
    if (isApiHttpError(e) && e.status === 403) return fallback;
    throw e;
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
      .catch(emptyOnForbidden({ patients: [], total: 0, page: 1, limit: 500 })),
    api.appointments.list().catch(emptyOnForbidden([])),
    api.prescriptions
      .list({ page: 1, limit: 500 })
      .catch(emptyOnForbidden({ prescriptions: [], total: 0, page: 1, limit: 500 })),
    api.invoices
      .list({ page: 1, limit: 500 })
      .catch(emptyOnForbidden({ invoices: [], total: 0, page: 1, limit: 500 })),
    api.lab.list({ page: 1, limit: 500 }).catch(emptyOnForbidden({ labOrders: [], total: 0, page: 1, limit: 500 })),
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
    api.dashboard.stats().catch(() => null),
    api.dashboard.recentPatients().catch(() => null),
    api.dashboard.revenueChart('daily').catch(() => null),
    api.dashboard.appointmentChart().catch(() => null),
  ]);
  return {
    dashboardApiStats: dashStats && typeof dashStats === 'object' ? dashStats : null,
    dashboardRecentPatients: Array.isArray(dashRecent) ? dashRecent : null,
    dashboardRevenueChart: Array.isArray(revC) ? revC : [],
    dashboardAppointmentChart: Array.isArray(apptC) ? apptC : [],
  };
}
