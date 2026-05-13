import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiFormDataRequest, coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField, unwrapSuccessData, unwrapSuccessDataArray } from '@/lib/core/domainShared';
import type {
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
import type { SaasOrder, SaasOrderItem, SaasOrderProduct, SaasProduct } from '@/types/tenantSaas';

function parseSaasProductRow(row: unknown): SaasProduct | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  if (typeof row.price !== 'number' || typeof row.costPrice !== 'number') return null;
  if (typeof row.clinicId !== 'string') return null;
  let imageUrl: string | null | undefined;
  if (row.imageUrl === null) imageUrl = null;
  else if (typeof row.imageUrl === 'string') imageUrl = row.imageUrl;
  else imageUrl = undefined;
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    costPrice: row.costPrice,
    imageUrl,
    clinicId: row.clinicId,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
  };
}

function parseSaasOrderItem(it: unknown): SaasOrderItem | null {
  if (!isRecord(it)) return null;
  if (
    typeof it.productId !== 'string' ||
    typeof it.quantity !== 'number' ||
    typeof it.id !== 'string' ||
    typeof it.orderId !== 'string' ||
    typeof it.unitPrice !== 'number' ||
    typeof it.lineTotal !== 'number'
  ) {
    return null;
  }
  return {
    id: it.id,
    orderId: it.orderId,
    productId: it.productId,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
    productName:
      typeof it.productName === 'string' || it.productName === null ? (it.productName as string | null) : undefined,
    product: isRecord(it.product) ? (it.product as SaasOrderProduct) : undefined,
  };
}

function parseSaasOrderRow(row: unknown): SaasOrder | null {
  if (!isRecord(row)) return null;
  if (
    typeof row.id !== 'string' ||
    typeof row.clinicId !== 'string' ||
    typeof row.currency !== 'string' ||
    typeof row.status !== 'string' ||
    typeof row.subtotal !== 'number' ||
    typeof row.total !== 'number' ||
    typeof row.paymentStatus !== 'string' ||
    !Array.isArray(row.items)
  ) {
    return null;
  }
  const items = row.items.map(parseSaasOrderItem).filter((x): x is SaasOrderItem => x !== null);
  if (items.length !== row.items.length) return null;
  return {
    id: row.id,
    clinicId: row.clinicId,
    currency: row.currency,
    status: row.status,
    subtotal: row.subtotal,
    total: row.total,
    paymentStatus: row.paymentStatus,
    notes: typeof row.notes === 'string' || row.notes === null ? (row.notes as string | null) : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
    items,
    profit: isRecord(row.profit) ? (row.profit as SaasOrder['profit']) : row.profit === null ? null : undefined,
    transactions: Array.isArray(row.transactions) ? (row.transactions as SaasOrder['transactions']) : undefined,
  };
}

export async function coreApiTenantProductsList(): Promise<SaasProduct[]> {
  const raw = await coreApiRequest<unknown>('/products');
  const arr = unwrapSuccessDataArray<SaasProduct>(raw) ?? [];
  return arr.map(parseSaasProductRow).filter((x): x is SaasProduct => x !== null);
}

export async function coreApiTenantProductById(id: string): Promise<SaasProduct> {
  const raw = await coreApiRequest<unknown>(`/products/${encodeURIComponent(id)}`);
  const single = unwrapSuccessData<unknown>(raw);
  const row = single !== undefined ? single : raw;
  const p = parseSaasProductRow(row);
  if (!p) throw new ApiHttpError('Invalid product payload', 500, '');
  return p;
}

export async function coreApiTenantProductCreate(
  name: string,
  price: number,
  costPrice = 0,
  imageUrl?: string | null
): Promise<SaasProduct> {
  const body: Record<string, unknown> = { name, price, costPrice };
  if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
    body.imageUrl = imageUrl;
  }
  const raw = await coreApiRequest<unknown>('/products', { method: 'POST', body });
  const single = unwrapSuccessData<unknown>(raw);
  const row = single !== undefined ? single : raw;
  const p = parseSaasProductRow(row);
  if (!p) throw new ApiHttpError('Unexpected product create response', 500, '');
  return p;
}

export async function coreApiTenantProductUpdate(
  id: string,
  name: string,
  price: number,
  costPrice?: number
): Promise<void> {
  const body: Record<string, unknown> = { name, price };
  if (costPrice !== undefined) body.costPrice = costPrice;
  await coreApiRequest<unknown>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

export async function coreApiTenantProductRemove(id: string): Promise<void> {
  await coreApiRequest<unknown>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function coreApiTenantUploadProductImage(
  file: File,
  assetType?: 'general' | 'clinicLogo' | 'doctorLogo'
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  if (assetType) form.append('assetType', assetType);
  const payload = await coreApiFormDataRequest<unknown>('/upload', { method: 'POST', formData: form });
  const url =
    isRecord(payload) &&
    isRecord(payload.data) &&
    typeof payload.data.url === 'string' &&
    payload.data.url.trim()
      ? payload.data.url.trim()
      : null;
  if (!url) {
    throw new ApiHttpError('Upload succeeded but image URL is missing', 500, '');
  }
  return url;
}

export async function coreApiTenantOrdersList(): Promise<SaasOrder[]> {
  const raw = await coreApiRequest<unknown>('/orders');
  const arr = unwrapSuccessDataArray<SaasOrder>(raw) ?? [];
  return arr.map(parseSaasOrderRow).filter((x): x is SaasOrder => x !== null);
}

export async function coreApiTenantOrderById(id: string): Promise<SaasOrder> {
  const raw = await coreApiRequest<unknown>(`/orders/${encodeURIComponent(id)}`);
  const single = unwrapSuccessData<unknown>(raw);
  const row = single !== undefined ? single : raw;
  const o = parseSaasOrderRow(row);
  if (!o) throw new ApiHttpError('Invalid order payload', 500, '');
  return o;
}

export async function coreApiTenantOrderCreate(productId: string, quantity: number): Promise<SaasOrder> {
  const raw = await coreApiRequest<unknown>('/orders', {
    method: 'POST',
    body: { productId, quantity },
  });
  const single = unwrapSuccessData<unknown>(raw);
  const row = single !== undefined ? single : raw;
  const o = parseSaasOrderRow(row);
  if (!o) throw new ApiHttpError('Unexpected order create response', 500, '');
  return o;
}

export async function coreApiTenantOrderRemove(id: string): Promise<void> {
  await coreApiRequest<unknown>(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function coreApiAdminStats(): Promise<AdminStatsPayload> {
  const raw = await coreApiRequest<unknown>('/admin/stats', { method: 'GET' });
  if (!isRecord(raw)) {
    throw new ApiHttpError('Invalid admin stats payload', 500, '');
  }
  return {
    users: numField(raw, 'users'),
    clinics: numField(raw, 'clinics'),
    saasOrders: numField(raw, 'saasOrders'),
    saasProducts: numField(raw, 'saasProducts'),
    subscriptions: numField(raw, 'subscriptions'),
    auditLogs7d: numField(raw, 'auditLogs7d'),
  };
}

export async function coreApiAdminMasterLogoGet(): Promise<{ logo: string }> {
  const raw = await coreApiRequest<unknown>('/admin/branding/logo', { method: 'GET' });
  if (!isRecord(raw)) return { logo: '' };
  return { logo: typeof raw.logo === 'string' ? raw.logo : '' };
}

export async function coreApiAdminMasterLogoUpdate(logo: string): Promise<{ logo: string }> {
  const raw = await coreApiRequest<unknown>('/admin/branding/logo', { method: 'PUT', body: { logo } });
  if (!isRecord(raw)) return { logo: '' };
  return { logo: typeof raw.logo === 'string' ? raw.logo : '' };
}

function parseAdminUserRow(row: unknown): AdminUserRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.email !== 'string' || typeof row.name !== 'string') return null;
  if (typeof row.role !== 'string') return null;
  const clinicId = typeof row.clinicId === 'string' ? row.clinicId : '';
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone === null || typeof row.phone === 'string' ? (row.phone as string | null) : null,
    clinicName: row.clinicName === null || typeof row.clinicName === 'string' ? (row.clinicName as string | null) : null,
    clinicId,
    isActive: Boolean(row.isActive),
    isApproved: Boolean(row.isApproved),
    accountStatus:
      row.accountStatus === null || typeof row.accountStatus === 'string'
        ? (row.accountStatus as string | null)
        : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString(),
    clinic:
      row.clinic && typeof row.clinic === 'object'
        ? (row.clinic as AdminUserRow['clinic'])
        : row.clinic === null
          ? null
          : undefined,
  };
}

export async function coreApiAdminUsers(params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
  clinicId?: string;
  sort?: string;
}): Promise<AdminUsersResponse> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.role) q.set('role', params.role);
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  if (params?.clinicId) q.set('clinicId', params.clinicId);
  if (params?.sort) q.set('sort', params.sort);
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.users)) {
    throw new ApiHttpError('Invalid admin users response', 500, '');
  }
  const users = raw.users.map(parseAdminUserRow).filter((u): u is AdminUserRow => u !== null);
  return {
    users,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

function parseAdminClinicRow(row: unknown): AdminClinicRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  const c = row._count;
  if (!isRecord(c)) return null;
  return {
    id: row.id,
    name: row.name,
    plan: typeof row.plan === 'string' ? row.plan : '',
    isActive: Boolean(row.isActive),
    phone: row.phone === null || typeof row.phone === 'string' ? (row.phone as string | null) : null,
    email: row.email === null || typeof row.email === 'string' ? (row.email as string | null) : null,
    address: row.address === null || typeof row.address === 'string' ? (row.address as string | null) : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    _count: {
      users: numField(c, 'users'),
      products: numField(c, 'products'),
      orders: numField(c, 'orders'),
      branches: typeof c.branches === 'number' ? c.branches : undefined,
    },
  };
}

export async function coreApiAdminClinics(): Promise<AdminClinicsResponse> {
  const raw = await coreApiRequest<unknown>('/admin/clinics', { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.clinics)) {
    throw new ApiHttpError('Invalid admin clinics response', 500, '');
  }
  const clinics = raw.clinics.map(parseAdminClinicRow).filter((c): c is AdminClinicRow => c !== null);
  return { clinics };
}

function parseAdminOrderRow(row: unknown): AdminOrderRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.clinicId !== 'string') return null;
  const clinic = row.clinic;
  if (!isRecord(clinic) || typeof clinic.id !== 'string' || typeof clinic.name !== 'string') return null;
  const cnt = row._count;
  if (!isRecord(cnt)) return null;
  return {
    id: row.id,
    clinicId: row.clinicId,
    currency: typeof row.currency === 'string' ? row.currency : '',
    status: typeof row.status === 'string' ? row.status : '',
    subtotal: numField(row, 'subtotal'),
    total: numField(row, 'total'),
    paymentStatus: typeof row.paymentStatus === 'string' ? row.paymentStatus : '',
    notes: row.notes === null || typeof row.notes === 'string' ? (row.notes as string | null) : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    clinic: {
      id: clinic.id,
      name: clinic.name,
      plan: typeof clinic.plan === 'string' ? clinic.plan : '',
      isActive: Boolean(clinic.isActive),
    },
    _count: { items: numField(cnt, 'items'), transactions: numField(cnt, 'transactions') },
  };
}

export async function coreApiAdminPlatformOrders(params?: { page?: number; limit?: number }): Promise<AdminOrdersResponse> {
  const q = new URLSearchParams();
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/admin/orders${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.orders)) {
    throw new ApiHttpError('Invalid admin orders response', 500, '');
  }
  const orders = raw.orders.map(parseAdminOrderRow).filter((o): o is AdminOrderRow => o !== null);
  return {
    orders,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

function parseAdminAuditLogRow(row: unknown): AdminAuditLogRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.userId !== 'string' || typeof row.action !== 'string') return null;
  const u = row.user;
  if (!isRecord(u) || typeof u.id !== 'string' || typeof u.email !== 'string') return null;
  return {
    id: row.id,
    userId: row.userId,
    action: row.action,
    entityId: row.entityId === null || typeof row.entityId === 'string' ? (row.entityId as string | null) : null,
    metadata: row.metadata,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    user: {
      id: u.id,
      email: u.email,
      name: typeof u.name === 'string' ? u.name : '',
      role: typeof u.role === 'string' ? u.role : '',
      clinicId: typeof u.clinicId === 'string' ? u.clinicId : '',
    },
  };
}

export async function coreApiAdminAuditLogs(params?: { page?: number; limit?: number }): Promise<AdminAuditLogsResponse> {
  const q = new URLSearchParams();
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.logs)) {
    throw new ApiHttpError('Invalid admin audit logs response', 500, '');
  }
  const logs = raw.logs.map(parseAdminAuditLogRow).filter((l): l is AdminAuditLogRow => l !== null);
  return {
    logs,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 30,
  };
}

/** Manual WhatsApp subscription settlement queue (`SUPER_ADMIN` only). */
export async function coreApiAdminSubscriptionPaymentsList(params?: { limit?: number }): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/admin/subscription-payments${qs ? `?${qs}` : ''}`, { method: 'GET' });
  const data = unwrapSuccessData<unknown[]>(raw);
  if (!Array.isArray(data)) {
    throw new ApiHttpError('Invalid subscription payments response', 500, '');
  }
  return data;
}

export async function coreApiAdminSubscriptionPaymentPatch(
  id: string,
  body: { status: 'CONTACTED' | 'PAID' | 'REJECTED' }
): Promise<unknown> {
  const raw = await coreApiRequest<unknown>(`/admin/subscription-payments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
  const data = unwrapSuccessData(raw);
  if (data === undefined) {
    throw new ApiHttpError('Invalid subscription payment update response', 500, '');
  }
  return data;
}
