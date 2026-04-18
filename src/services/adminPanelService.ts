import { apiRequest } from '@/lib/apiClient';

export type AdminStatsPayload = {
  users: number;
  clinics: number;
  saasOrders: number;
  saasProducts: number;
  subscriptions: number;
  auditLogs7d: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  clinicName: string | null;
  clinicId: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  clinic?: { id: string; name: string; plan: string; isActive: boolean } | null;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminClinicRow = {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; products: number; orders: number; branches?: number };
};

export type AdminClinicsResponse = { clinics: AdminClinicRow[] };

export type AdminOrderRow = {
  id: string;
  clinicId: string;
  currency: string;
  status: string;
  subtotal: number;
  total: number;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  clinic: { id: string; name: string; plan: string; isActive: boolean };
  _count: { items: number; transactions: number };
};

export type AdminOrdersResponse = {
  orders: AdminOrderRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminAuditLogRow = {
  id: string;
  userId: string;
  action: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: string; email: string; name: string; role: string; clinicId: string };
};

export type AdminAuditLogsResponse = {
  logs: AdminAuditLogRow[];
  total: number;
  page: number;
  limit: number;
};

function withQuery(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return path;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function fetchAdminStats(): Promise<AdminStatsPayload> {
  return apiRequest('/api/admin/stats') as Promise<AdminStatsPayload>;
}

export function fetchAdminUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<AdminUsersResponse> {
  return apiRequest(withQuery('/api/admin/users', params)) as Promise<AdminUsersResponse>;
}

export function fetchAdminClinics(): Promise<AdminClinicsResponse> {
  return apiRequest('/api/admin/clinics') as Promise<AdminClinicsResponse>;
}

export function fetchAdminOrders(params?: { page?: number; limit?: number }): Promise<AdminOrdersResponse> {
  return apiRequest(withQuery('/api/admin/orders', params)) as Promise<AdminOrdersResponse>;
}

export function fetchAdminAuditLogs(params?: { page?: number; limit?: number }): Promise<AdminAuditLogsResponse> {
  return apiRequest(withQuery('/api/admin/audit-logs', params)) as Promise<AdminAuditLogsResponse>;
}
