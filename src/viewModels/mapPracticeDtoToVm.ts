/**
 * Single place that knows practice list DTO shapes from the API/core layer.
 * UI and view hooks import only ViewModels + functions from this module.
 */
import type {
  DashboardAppointmentChartPoint,
  DashboardRevenueChartPoint,
  DashboardStatsPayload,
} from '@/types/dashboardApi';
import type { PracticeAppointmentListItem } from '@/types/practiceAppointments';
import type { PracticeInvoiceListItem, PracticeLabOrderListItem } from '@/types/practiceBilling';
import type { PracticePatientSummary } from '@/types/practicePatients';
import type { PracticePrescriptionDrugRow, PracticePrescriptionListItem } from '@/types/practicePrescriptions';
import type { AppointmentViewModel } from '@/viewModels/appointment.viewModel';
import type {
  DashboardAppointmentChartPointViewModel,
  DashboardRevenueChartPointViewModel,
  DashboardStatsViewModel,
} from '@/viewModels/dashboardCharts.viewModel';
import type { InvoiceViewModel } from '@/viewModels/invoice.viewModel';
import type { LabOrderViewModel } from '@/viewModels/lab.viewModel';
import type { PatientViewModel } from '@/viewModels/patient.viewModel';
import type { PrescriptionDrugViewModel, PrescriptionViewModel } from '@/viewModels/prescription.viewModel';

export function mapPatientToViewModel(p: PracticePatientSummary): PatientViewModel {
  return {
    id: p.id,
    regNo: p.regNo,
    name: p.name,
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    address: p.address,
    bloodGroup: p.bloodGroup,
    occupation: p.occupation,
    refBy: p.refBy,
    createdAt: p.createdAt,
  };
}

export function mapAppointmentToViewModel(a: PracticeAppointmentListItem): AppointmentViewModel {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    date: a.date,
    time: a.time,
    type: a.type,
    status: a.status,
    duration: a.duration,
    notes: a.notes,
  };
}

export function mapPrescriptionDrugToViewModel(d: PracticePrescriptionDrugRow): PrescriptionDrugViewModel {
  return {
    id: d.id,
    brand: d.brand,
    dose: d.dose,
    duration: d.duration,
    frequency: d.frequency,
    instruction: d.instruction,
    maxDailyDose: d.maxDailyDose,
    doctorNotes: d.doctorNotes,
    allowDoseOverride: d.allowDoseOverride,
    beforeFood: d.beforeFood,
    afterFood: d.afterFood,
  };
}

export function mapPrescriptionToViewModel(rx: PracticePrescriptionListItem): PrescriptionViewModel {
  return {
    id: rx.id,
    patientId: rx.patientId,
    patientName: rx.patientName,
    date: rx.date,
    diagnosis: rx.diagnosis,
    patient: {
      id: rx.patient.id,
      name: rx.patient.name,
      phone: rx.patient.phone,
      regNo: rx.patient.regNo,
    },
    drugs: rx.drugs.map(mapPrescriptionDrugToViewModel),
  };
}

export function mapInvoiceToViewModel(inv: PracticeInvoiceListItem): InvoiceViewModel {
  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    patientName: inv.patientName,
    total: inv.total,
    paid: inv.paid,
    due: inv.due,
    date: inv.date,
    dueDate: inv.dueDate,
    status: inv.status,
  };
}

export function mapLabOrderToViewModel(lo: PracticeLabOrderListItem): LabOrderViewModel {
  return {
    id: lo.id,
    patientName: lo.patientName,
    workType: lo.workType,
    status: lo.status,
    orderDate: lo.orderDate,
  };
}

export function mapDashboardStatsToViewModel(s: DashboardStatsPayload): DashboardStatsViewModel {
  return {
    totalPatients: s.totalPatients,
    newPatientsThisMonth: s.newPatientsThisMonth,
    todayAppointments: s.todayAppointments,
    upcomingAppointments: s.upcomingAppointments,
    monthlyRevenue: s.monthlyRevenue,
    pendingDue: s.pendingDue,
    pendingLabOrders: s.pendingLabOrders,
    prescriptionsThisMonth: s.prescriptionsThisMonth,
    pendingInvoicesCount: s.pendingInvoicesCount,
    overdueInvoicesCount: s.overdueInvoicesCount,
  };
}

export function mapRevenueChartPointToViewModel(pt: DashboardRevenueChartPoint): DashboardRevenueChartPointViewModel {
  return { date: pt.date, revenue: pt.revenue };
}

export function mapAppointmentChartPointToViewModel(
  pt: DashboardAppointmentChartPoint
): DashboardAppointmentChartPointViewModel {
  return { date: pt.date, count: pt.count };
}

/** Bridge: optimistic factory / core transport expects DTO drug row */
export function mapPrescriptionDrugViewModelToOptimisticDrugInput(
  d: PrescriptionDrugViewModel
): PracticePrescriptionDrugRow {
  return {
    id: d.id,
    brand: d.brand,
    dose: d.dose,
    duration: d.duration,
    frequency: d.frequency,
    instruction: d.instruction,
    maxDailyDose: d.maxDailyDose,
    doctorNotes: d.doctorNotes,
    allowDoseOverride: d.allowDoseOverride,
    beforeFood: d.beforeFood,
    afterFood: d.afterFood,
  };
}

/** Bridge: optimistic patient shape for core factories */
export function mapPatientViewModelToOptimisticPatientInput(p: PatientViewModel): PracticePatientSummary {
  return {
    id: p.id,
    regNo: p.regNo,
    name: p.name,
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    address: p.address,
    bloodGroup: p.bloodGroup,
    occupation: p.occupation,
    refBy: p.refBy,
    createdAt: p.createdAt,
  };
}
