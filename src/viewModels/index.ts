export type { PatientViewModel } from '@/viewModels/patient.viewModel';
export type { AppointmentViewModel } from '@/viewModels/appointment.viewModel';
export type { PrescriptionDrugViewModel, PrescriptionViewModel } from '@/viewModels/prescription.viewModel';
export type { InvoiceViewModel } from '@/viewModels/invoice.viewModel';
export type { LabOrderViewModel } from '@/viewModels/lab.viewModel';
export type {
  DashboardAppointmentChartPointViewModel,
  DashboardRevenueChartPointViewModel,
  DashboardStatsViewModel,
} from '@/viewModels/dashboardCharts.viewModel';

export {
  mapAppointmentChartPointToViewModel,
  mapAppointmentToViewModel,
  mapDashboardStatsToViewModel,
  mapInvoiceToViewModel,
  mapLabOrderToViewModel,
  mapPatientToViewModel,
  mapPatientViewModelToOptimisticPatientInput,
  mapPrescriptionDrugViewModelToOptimisticDrugInput,
  mapPrescriptionToViewModel,
  mapRevenueChartPointToViewModel,
} from '@/viewModels/mapPracticeDtoToVm';
