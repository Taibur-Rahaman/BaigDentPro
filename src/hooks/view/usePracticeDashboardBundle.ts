import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
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
  function mapList<T, R>(label: string, rows: T[], fn: (row: T) => R): R[] {
    const out: R[] = [];
    for (const row of rows) {
      try {
        out.push(fn(row));
      } catch (e) {
        console.warn(`[usePracticeDashboardBundle] skipped invalid ${label} row`, e);
      }
    }
    return out;
  }

  return {
    patients: mapList('patient', listPayload.patients, mapPatientToViewModel),
    appointments: mapList('appointment', listPayload.appointments, mapAppointmentToViewModel),
    prescriptions: mapList('prescription', listPayload.prescriptions, mapPrescriptionToViewModel),
    invoices: mapList('invoice', listPayload.invoices, mapInvoiceToViewModel),
    labOrders: mapList('labOrder', listPayload.labOrders, mapLabOrderToViewModel),
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
  const loadGenerationRef = useRef(0);

  const reload = useCallback(async () => {
    if (!token) {
      loadGenerationRef.current += 1;
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
    const gen = ++loadGenerationRef.current;
    setDataLoading(true);
    setApiError(null);
    try {
      const listPayload = await loadPracticeLists();
      if (gen !== loadGenerationRef.current) return;
      const vm = mapPracticeListDtosToViewModels(listPayload);
      setPatients(vm.patients);
      setAppointments(vm.appointments);
      setPrescriptions(vm.prescriptions);
      setInvoices(vm.invoices);
      setLabOrders(vm.labOrders);

      const dashPayload = await loadDashboardAggregates();
      if (gen !== loadGenerationRef.current) return;
      setDashboardApiStats(
        dashPayload.dashboardApiStats ? mapDashboardStatsToViewModel(dashPayload.dashboardApiStats) : null
      );
      setDashboardRecentPatients(
        dashPayload.dashboardRecentPatients
          ? dashPayload.dashboardRecentPatients.flatMap((row) => {
              try {
                return [mapPatientToViewModel(row)];
              } catch (e) {
                console.warn('[usePracticeDashboardBundle] skipped invalid recent patient row', e);
                return [];
              }
            })
          : null
      );
      setDashboardRevenueChart(dashPayload.dashboardRevenueChart.map(mapRevenueChartPointToViewModel));
      setDashboardAppointmentChart(dashPayload.dashboardAppointmentChart.map(mapAppointmentChartPointToViewModel));
    } catch (e: unknown) {
      if (gen !== loadGenerationRef.current) return;
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
      if (gen === loadGenerationRef.current) {
        setDataLoading(false);
      }
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

  /** One fetch per token change — avoids effect re-running if `reload` identity ever churns. */
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    void reloadRef.current();
  }, [token]);

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
