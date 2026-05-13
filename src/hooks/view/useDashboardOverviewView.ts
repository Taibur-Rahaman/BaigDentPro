import { useMemo } from 'react';
import type {
  AppointmentViewModel,
  DashboardStatsViewModel,
  InvoiceViewModel,
  LabOrderViewModel,
  PatientViewModel,
  PrescriptionViewModel,
} from '@/viewModels';
import { formatLocalYMD } from '@/viewModels/formatters';

function invoiceIsOverdue(inv: InvoiceViewModel): boolean {
  if (inv.status === 'PAID' || inv.due <= 0) return false;
  const todayYmd = formatLocalYMD(new Date());
  if (inv.dueDate) return inv.dueDate < todayYmd;
  return inv.status === 'OVERDUE';
}

export type PracticeOverviewStatsVm = {
  totalPatients: number;
  todayAppointments: number;
  totalPrescriptions: number;
  prescriptionStatLabel: string;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingLab: number;
  monthlyRevenue: number;
  revenueStatLabel: string;
  pendingDue: number;
  upcomingAppointments: number;
  newPatientsThisMonth: number;
};

export function useDashboardOverviewView(opts: {
  dashboardApiStats: DashboardStatsViewModel | null;
  patients: PatientViewModel[];
  appointments: AppointmentViewModel[];
  prescriptions: PrescriptionViewModel[];
  invoices: InvoiceViewModel[];
  labOrders: LabOrderViewModel[];
  todayAppointmentsCount: number;
}): PracticeOverviewStatsVm {
  const { dashboardApiStats, patients, appointments, prescriptions, invoices, labOrders, todayAppointmentsCount } =
    opts;

  return useMemo(() => {
    if (dashboardApiStats) {
      return {
        totalPatients: dashboardApiStats.totalPatients,
        todayAppointments: dashboardApiStats.todayAppointments,
        totalPrescriptions: dashboardApiStats.prescriptionsThisMonth,
        prescriptionStatLabel: 'Prescriptions (this month)',
        pendingInvoices: dashboardApiStats.pendingInvoicesCount,
        overdueInvoices:
          dashboardApiStats.overdueInvoicesCount ?? invoices.filter(invoiceIsOverdue).length,
        pendingLab: dashboardApiStats.pendingLabOrders,
        monthlyRevenue: dashboardApiStats.monthlyRevenue,
        revenueStatLabel: 'Collected (this month)',
        pendingDue: dashboardApiStats.pendingDue,
        upcomingAppointments: dashboardApiStats.upcomingAppointments,
        newPatientsThisMonth: dashboardApiStats.newPatientsThisMonth,
      };
    }
    return {
      totalPatients: patients.length,
      todayAppointments: todayAppointmentsCount,
      totalPrescriptions: prescriptions.length,
      prescriptionStatLabel: 'Prescriptions',
      pendingInvoices: invoices.filter((i) => i.status !== 'PAID').length,
      overdueInvoices: invoices.filter(invoiceIsOverdue).length,
      pendingLab: labOrders.filter((l) => l.status !== 'DELIVERED').length,
      monthlyRevenue: invoices.reduce((sum, i) => sum + i.paid, 0),
      revenueStatLabel: 'Total collected (loaded)',
      pendingDue: invoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + i.due, 0),
      upcomingAppointments: appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
      newPatientsThisMonth: 0,
    };
  }, [dashboardApiStats, patients, todayAppointmentsCount, prescriptions, invoices, labOrders, appointments]);
}
