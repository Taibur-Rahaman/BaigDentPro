import api from '@/api';

export type {
  AdminAuditLogRow,
  AdminAuditLogsResponse,
  AdminClinicRow,
  AdminClinicsResponse,
  AdminOrderRow,
  AdminOrdersResponse,
  AdminStatsPayload,
  AdminUserRow,
  AdminUsersResponse,
} from '@/types/adminPanel';

export function fetchAdminStats() {
  return api.admin.stats();
}

export function fetchAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sort?: string;
}) {
  return api.admin.users(params);
}

export function updateAdminUser(userId: string, body: Record<string, unknown>) {
  return api.admin.updateUser(userId, body);
}

export function fetchAdminClinics() {
  return api.admin.clinics();
}

export function disableAdminClinic(params: { clinicId: string; disabled: boolean }) {
  return api.admin.disableClinic(params);
}

export function fetchAdminOrders(params?: { page?: number; limit?: number }) {
  return api.admin.platformOrders(params);
}

export function fetchAdminAuditLogs(params?: { page?: number; limit?: number }) {
  return api.admin.auditLogs(params);
}
