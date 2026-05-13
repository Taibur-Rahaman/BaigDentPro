import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import { parsePatientSummaryRow } from '@/lib/core/corePatientsApi';
import { parseAppointmentListItem } from '@/lib/core/coreAppointmentsApi';
import type {
  DashboardAppointmentChartPoint,
  DashboardRevenueChartPoint,
  DashboardStatsPayload,
  DashboardTodayBundle,
  DashboardTreatmentStatRow,
} from '@/types/dashboardApi';
import type { PracticePatientSummary } from '@/types/practicePatients';

export async function coreApiDashboardStats(): Promise<DashboardStatsPayload> {
  const raw = await coreApiRequest<unknown>('/dashboard/stats', { method: 'GET' });
  if (!isRecord(raw)) {
    throw new ApiHttpError('Invalid dashboard stats response', 500, '');
  }
  return {
    totalPatients: numField(raw, 'totalPatients'),
    newPatientsThisMonth: numField(raw, 'newPatientsThisMonth'),
    todayAppointments: numField(raw, 'todayAppointments'),
    upcomingAppointments: numField(raw, 'upcomingAppointments'),
    monthlyRevenue: numField(raw, 'monthlyRevenue'),
    pendingDue: numField(raw, 'pendingDue'),
    pendingLabOrders: numField(raw, 'pendingLabOrders'),
    prescriptionsThisMonth: numField(raw, 'prescriptionsThisMonth'),
    pendingInvoicesCount: numField(raw, 'pendingInvoicesCount'),
    overdueInvoicesCount:
      typeof raw.overdueInvoicesCount === 'number' && !Number.isNaN(raw.overdueInvoicesCount)
        ? raw.overdueInvoicesCount
        : undefined,
  };
}

export async function coreApiDashboardRecentPatients(): Promise<PracticePatientSummary[]> {
  const raw = await coreApiRequest<unknown>('/dashboard/recent-patients', { method: 'GET' });
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid recent patients response', 500, '');
  }
  return raw.map(parsePatientSummaryRow).filter((p): p is PracticePatientSummary => p !== null);
}

export async function coreApiDashboardRevenueChart(
  period: 'daily' | 'monthly' = 'monthly'
): Promise<DashboardRevenueChartPoint[]> {
  const raw = await coreApiRequest<unknown>(
    `/dashboard/revenue-chart?period=${encodeURIComponent(period)}`,
    { method: 'GET' }
  );
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid revenue chart response', 500, '');
  }
  return raw
    .map((row): DashboardRevenueChartPoint | null => {
      if (!isRecord(row)) return null;
      const revenue = typeof row.revenue === 'number' ? row.revenue : 0;
      const date = typeof row.date === 'string' ? row.date : '';
      if (!date) return null;
      return { date, revenue };
    })
    .filter((x): x is DashboardRevenueChartPoint => x !== null);
}

/** Normalized dashboard appointment-volume series (`GET /dashboard/appointment-chart`). */
export async function coreApiDashboardAppointmentChart(): Promise<DashboardAppointmentChartPoint[]> {
  const raw = await coreApiRequest<unknown>('/dashboard/appointment-chart', { method: 'GET' });
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid appointment chart response', 500, '');
  }
  return raw
    .map((row): DashboardAppointmentChartPoint | null => {
      if (!isRecord(row)) return null;
      const count = typeof row.count === 'number' ? row.count : 0;
      const date = typeof row.date === 'string' ? row.date : '';
      if (!date) return null;
      return { date, count };
    })
    .filter((x): x is DashboardAppointmentChartPoint => x !== null);
}

function parseTodayPrescription(row: unknown): DashboardTodayBundle['prescriptions'][number] | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const pr = row.patient;
  const patientName = isRecord(pr) && typeof pr.name === 'string' ? pr.name : 'Unknown';
  return {
    id: row.id,
    diagnosis: typeof row.diagnosis === 'string' ? row.diagnosis : '',
    patientName,
  };
}

function parseTodayInvoice(row: unknown): DashboardTodayBundle['invoices'][number] | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const pr = row.patient;
  const patientName = isRecord(pr) && typeof pr.name === 'string' ? pr.name : 'Unknown';
  const total =
    typeof row.total === 'number' && !Number.isNaN(row.total)
      ? row.total
      : parseFloat(String(row.total ?? 0)) || 0;
  return {
    id: row.id,
    invoiceNo: typeof row.invoiceNo === 'string' ? row.invoiceNo : row.id,
    patientName,
    total,
  };
}

export async function coreApiDashboardToday(): Promise<DashboardTodayBundle> {
  const raw = await coreApiRequest<unknown>('/dashboard/today', { method: 'GET' });
  if (!isRecord(raw)) {
    throw new ApiHttpError('Invalid dashboard today response', 500, '');
  }
  const aptRaw = raw.appointments;
  const prRaw = raw.prescriptions;
  const invRaw = raw.invoices;
  const appointments = Array.isArray(aptRaw)
    ? aptRaw.map(parseAppointmentListItem).filter((x) => x !== null)
    : [];
  const prescriptions = Array.isArray(prRaw)
    ? prRaw.map(parseTodayPrescription).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const invoices = Array.isArray(invRaw)
    ? invRaw.map(parseTodayInvoice).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  return { appointments, prescriptions, invoices };
}

export async function coreApiDashboardTreatmentStats(): Promise<DashboardTreatmentStatRow[]> {
  const raw = await coreApiRequest<unknown>('/dashboard/treatment-stats', { method: 'GET' });
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid treatment stats response', 500, '');
  }
  return raw
    .map((row): DashboardTreatmentStatRow | null => {
      if (!isRecord(row)) return null;
      const procedure = typeof row.procedure === 'string' ? row.procedure : '';
      const count = typeof row.count === 'number' ? row.count : 0;
      if (!procedure) return null;
      return { procedure, count };
    })
    .filter((x): x is DashboardTreatmentStatRow => x !== null);
}
