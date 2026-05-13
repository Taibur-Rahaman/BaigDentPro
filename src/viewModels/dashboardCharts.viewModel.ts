/** Dashboard aggregate stats (UI) */
export interface DashboardStatsViewModel {
  totalPatients: number;
  newPatientsThisMonth: number;
  todayAppointments: number;
  upcomingAppointments: number;
  monthlyRevenue: number;
  pendingDue: number;
  pendingLabOrders: number;
  prescriptionsThisMonth: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount?: number;
}

export interface DashboardRevenueChartPointViewModel {
  date: string;
  revenue: number;
}

export interface DashboardAppointmentChartPointViewModel {
  date: string;
  count: number;
}
