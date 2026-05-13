/** Normalized super-admin dashboard counters (`GET /super-admin/stats`). */
export interface SuperAdminStats {
  totalClinics: number;
  totalPatients: number;
  totalAppointments: number;
  totalPrescriptions: number;
  totalRevenue: number;
  activityLogCount: number;
}
