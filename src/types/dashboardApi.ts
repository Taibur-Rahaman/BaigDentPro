/** Normalized `GET /dashboard/stats` payload for dashboard KPI cards. */
export type DashboardStatsPayload = {
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
};

/** Normalized `GET /dashboard/revenue-chart` point. */
export type DashboardRevenueChartPoint = { date: string; revenue: number };

/** Normalized `GET /dashboard/appointment-chart` point. */
export type DashboardAppointmentChartPoint = { date: string; count: number };

/**
 * Appointment rows returned for `GET /dashboard/today` — structurally aligned with core list parsing,
 * declared here to avoid coupling this module to `practiceAppointments` DTO exports.
 */
export type DashboardTodayAppointmentRow = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string;
  type: string;
  status: string;
  duration?: number;
  notes?: string;
};

/** `GET /dashboard/today` bundle (appointments parsed in core; Rx/inv lightweight rows). */
export type DashboardTodayBundle = {
  appointments: DashboardTodayAppointmentRow[];
  prescriptions: Array<{ id: string; diagnosis: string; patientName: string }>;
  invoices: Array<{ id: string; invoiceNo: string; patientName: string; total: number }>;
};

/** `GET /dashboard/treatment-stats` row. */
export type DashboardTreatmentStatRow = { procedure: string; count: number };
