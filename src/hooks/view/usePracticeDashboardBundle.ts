import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { PracticeListsLoadResult } from '@/hooks/view/practiceDashboardLoaders';
import { loadDashboardAggregates, loadPracticeLists } from '@/hooks/view/practiceDashboardLoaders';
import { useAppointmentsView } from '@/hooks/view/useAppointmentsView';
import { useDashboardChartsView } from '@/hooks/view/useDashboardChartsView';
import { usePatientsView } from '@/hooks/view/usePatientsView';
import { usePrescriptionsInvoicesLabView } from '@/hooks/view/usePrescriptionsInvoicesLabView';
import type {
  AppointmentViewModel,
  DashboardAppointmentChartPointViewModel,
  DashboardRevenueChartPointViewModel,
  DashboardStatsViewModel,
  InvoiceViewModel,
  LabOrderViewModel,
  PatientViewModel,
  PrescriptionViewModel,
} from '@/viewModels';
import {
  mapAppointmentChartPointToViewModel,
  mapAppointmentToViewModel,
  mapDashboardStatsToViewModel,
  mapInvoiceToViewModel,
  mapLabOrderToViewModel,
  mapPatientToViewModel,
  mapPrescriptionToViewModel,
  mapRevenueChartPointToViewModel,
} from '@/viewModels';

export interface PracticeDashboardBundle {
  patients: PatientViewModel[];
  setPatients: Dispatch<SetStateAction<PatientViewModel[]>>;
  appointments: AppointmentViewModel[];
  setAppointments: Dispatch<SetStateAction<AppointmentViewModel[]>>;
  prescriptions: PrescriptionViewModel[];
  setPrescriptions: Dispatch<SetStateAction<PrescriptionViewModel[]>>;
  invoices: InvoiceViewModel[];
  setInvoices: Dispatch<SetStateAction<InvoiceViewModel[]>>;
  labOrders: LabOrderViewModel[];
  setLabOrders: Dispatch<SetStateAction<LabOrderViewModel[]>>;
  dashboardApiStats: DashboardStatsViewModel | null;
  setDashboardApiStats: Dispatch<SetStateAction<DashboardStatsViewModel | null>>;
  dashboardRecentPatients: PatientViewModel[] | null;
  setDashboardRecentPatients: Dispatch<SetStateAction<PatientViewModel[] | null>>;
  dashboardRevenueChart: DashboardRevenueChartPointViewModel[];
  setDashboardRevenueChart: Dispatch<SetStateAction<DashboardRevenueChartPointViewModel[]>>;
  dashboardAppointmentChart: DashboardAppointmentChartPointViewModel[];
  setDashboardAppointmentChart: Dispatch<SetStateAction<DashboardAppointmentChartPointViewModel[]>>;
  dataLoading: boolean;
  apiError: string | null;
  setApiError: Dispatch<SetStateAction<string | null>>;
  /** Refetch practice lists + dashboard aggregates (same contract as the former inline `loadData`). */
  reload: () => Promise<void>;
}

/** DTO payloads from loaders → view models (only place in this hook that touches list DTO shapes). */
function mapPracticeListDtosToViewModels(listPayload: PracticeListsLoadResult) {
  return {
    patients: listPayload.patients.map(mapPatientToViewModel),
    appointments: listPayload.appointments.map(mapAppointmentToViewModel),
    prescriptions: listPayload.prescriptions.map(mapPrescriptionToViewModel),
    invoices: listPayload.invoices.map(mapInvoiceToViewModel),
    labOrders: listPayload.labOrders.map(mapLabOrderToViewModel),
  };
}

/**
 * Practice home bundle: composes domain view hooks (ViewModels only at the boundary), merges loading/error.
 */
export function usePracticeDashboardBundle(token: string | null | undefined): PracticeDashboardBundle {
  const { patients, setPatients } = usePatientsView();
  const { appointments, setAppointments } = useAppointmentsView();
  const {
    prescriptions,
    setPrescriptions,
    invoices,
    setInvoices,
    labOrders,
    setLabOrders,
  } = usePrescriptionsInvoicesLabView();
  const {
    dashboardApiStats,
    setDashboardApiStats,
    dashboardRecentPatients,
    setDashboardRecentPatients,
    dashboardRevenueChart,
    setDashboardRevenueChart,
    dashboardAppointmentChart,
    setDashboardAppointmentChart,
  } = useDashboardChartsView();
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setDashboardApiStats(null);
      setDashboardRecentPatients(null);
      setDashboardRevenueChart([]);
      setDashboardAppointmentChart([]);
      setPatients([]);
      setPrescriptions([]);
      setAppointments([]);
      setInvoices([]);
      setLabOrders([]);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setApiError(null);
    try {
      const listPayload = await loadPracticeLists();
      const vm = mapPracticeListDtosToViewModels(listPayload);
      setPatients(vm.patients);
      setAppointments(vm.appointments);
      setPrescriptions(vm.prescriptions);
      setInvoices(vm.invoices);
      setLabOrders(vm.labOrders);

      const dashPayload = await loadDashboardAggregates();
      setDashboardApiStats(
        dashPayload.dashboardApiStats ? mapDashboardStatsToViewModel(dashPayload.dashboardApiStats) : null
      );
      setDashboardRecentPatients(
        dashPayload.dashboardRecentPatients ? dashPayload.dashboardRecentPatients.map(mapPatientToViewModel) : null
      );
      setDashboardRevenueChart(dashPayload.dashboardRevenueChart.map(mapRevenueChartPointToViewModel));
      setDashboardAppointmentChart(dashPayload.dashboardAppointmentChart.map(mapAppointmentChartPointToViewModel));
    } catch (e: unknown) {
      console.error('API load error:', e);
      setApiError(e instanceof Error ? e.message : 'Failed to load data');
      setDashboardApiStats(null);
      setDashboardRecentPatients(null);
      setDashboardRevenueChart([]);
      setDashboardAppointmentChart([]);
      setPatients([]);
      setPrescriptions([]);
      setAppointments([]);
      setInvoices([]);
      setLabOrders([]);
    } finally {
      setDataLoading(false);
    }
  }, [
    token,
    setPatients,
    setAppointments,
    setPrescriptions,
    setInvoices,
    setLabOrders,
    setDashboardApiStats,
    setDashboardRecentPatients,
    setDashboardRevenueChart,
    setDashboardAppointmentChart,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    patients,
    setPatients,
    appointments,
    setAppointments,
    prescriptions,
    setPrescriptions,
    invoices,
    setInvoices,
    labOrders,
    setLabOrders,
    dashboardApiStats,
    setDashboardApiStats,
    dashboardRecentPatients,
    setDashboardRecentPatients,
    dashboardRevenueChart,
    setDashboardRevenueChart,
    dashboardAppointmentChart,
    setDashboardAppointmentChart,
    dataLoading,
    apiError,
    setApiError,
    reload,
  };
}
