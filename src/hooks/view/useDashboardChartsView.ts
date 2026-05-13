import { useState, type Dispatch, type SetStateAction } from 'react';
import type {
  DashboardAppointmentChartPointViewModel,
  DashboardRevenueChartPointViewModel,
  DashboardStatsViewModel,
  PatientViewModel,
} from '@/viewModels';

export interface DashboardChartsView {
  dashboardApiStats: DashboardStatsViewModel | null;
  setDashboardApiStats: Dispatch<SetStateAction<DashboardStatsViewModel | null>>;
  dashboardRecentPatients: PatientViewModel[] | null;
  setDashboardRecentPatients: Dispatch<SetStateAction<PatientViewModel[] | null>>;
  dashboardRevenueChart: DashboardRevenueChartPointViewModel[];
  setDashboardRevenueChart: Dispatch<SetStateAction<DashboardRevenueChartPointViewModel[]>>;
  dashboardAppointmentChart: DashboardAppointmentChartPointViewModel[];
  setDashboardAppointmentChart: Dispatch<SetStateAction<DashboardAppointmentChartPointViewModel[]>>;
}

export function useDashboardChartsView(): DashboardChartsView {
  const [dashboardApiStats, setDashboardApiStats] = useState<DashboardStatsViewModel | null>(null);
  const [dashboardRecentPatients, setDashboardRecentPatients] = useState<PatientViewModel[] | null>(null);
  const [dashboardRevenueChart, setDashboardRevenueChart] = useState<DashboardRevenueChartPointViewModel[]>([]);
  const [dashboardAppointmentChart, setDashboardAppointmentChart] = useState<DashboardAppointmentChartPointViewModel[]>(
    []
  );
  return {
    dashboardApiStats,
    setDashboardApiStats,
    dashboardRecentPatients,
    setDashboardRecentPatients,
    dashboardRevenueChart,
    setDashboardRevenueChart,
    dashboardAppointmentChart,
    setDashboardAppointmentChart,
  };
}
