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
  accountStatus?: string | null;
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
