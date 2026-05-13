import { ApiHttpError } from '@/lib/apiErrors';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import type {
  ShopAdminOrdersListPayload,
  ShopAdminOrderRow,
  ShopAdminProductsListPayload,
  ShopAdminProductRow,
  ShopAdminStatsPayload,
  ShopCategoryRow,
} from '@/types/shopAdmin';

function parseShopCategoryRow(row: unknown): ShopCategoryRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  const out: ShopCategoryRow = { id: row.id, name: row.name };
  if (typeof row.icon === 'string') out.icon = row.icon;
  if (typeof row.count === 'number') out.count = row.count;
  return out;
}

export async function coreApiShopProductCategories(): Promise<ShopCategoryRow[]> {
  const raw = await coreApiRequest<unknown>('/shop/products/categories', { method: 'GET' });
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid shop categories response', 500, '');
  }
  return raw.map(parseShopCategoryRow).filter((x): x is ShopCategoryRow => x !== null);
}

function parseShopAdminProductRow(row: unknown): ShopAdminProductRow | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    category: typeof row.category === 'string' ? row.category : 'OTHER',
    price: numField(row, 'price'),
    cost: row.cost === null || typeof row.cost === 'number' ? row.cost : null,
    stock: numField(row, 'stock'),
    isActive: Boolean(row.isActive),
    sku: row.sku === null || typeof row.sku === 'string' ? row.sku : null,
  };
}

export async function coreApiShopAdminProductsList(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ShopAdminProductsListPayload> {
  const q = new URLSearchParams();
  if (params?.category) q.set('category', params.category);
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/shop/admin/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.products)) {
    throw new ApiHttpError('Invalid shop admin products response', 500, '');
  }
  const products = raw.products.map(parseShopAdminProductRow).filter((x): x is ShopAdminProductRow => x !== null);
  return {
    products,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

function parseShopAdminOrderRow(row: unknown): ShopAdminOrderRow | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items = rawItems
    .map((it) => {
      if (!isRecord(it) || typeof it.name !== 'string') return null;
      return { name: it.name, quantity: numField(it, 'quantity'), total: numField(it, 'total') };
    })
    .filter((x): x is ShopAdminOrderRow['items'][number] => x !== null);
  return {
    id: row.id,
    orderNo: typeof row.orderNo === 'string' ? row.orderNo : row.id,
    customerName: typeof row.customerName === 'string' ? row.customerName : '',
    customerPhone: typeof row.customerPhone === 'string' ? row.customerPhone : '',
    total: numField(row, 'total'),
    status: typeof row.status === 'string' ? row.status : '',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    items,
  };
}

export async function coreApiShopAdminOrdersList(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ShopAdminOrdersListPayload> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/shop/admin/orders${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.orders)) {
    throw new ApiHttpError('Invalid shop admin orders response', 500, '');
  }
  const orders = raw.orders.map(parseShopAdminOrderRow).filter((x): x is ShopAdminOrderRow => x !== null);
  return {
    orders,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

function numObj(raw: unknown, path: string[]): number {
  let cur: unknown = raw;
  for (const p of path) {
    if (!isRecord(cur)) return 0;
    cur = cur[p];
  }
  return typeof cur === 'number' && !Number.isNaN(cur) ? cur : 0;
}

export async function coreApiShopAdminStats(): Promise<ShopAdminStatsPayload> {
  const raw = await coreApiRequest<unknown>('/shop/admin/stats', { method: 'GET' });
  if (!isRecord(raw)) {
    throw new ApiHttpError('Invalid shop admin stats response', 500, '');
  }
  return {
    products: {
      total: numObj(raw, ['products', 'total']),
      active: numObj(raw, ['products', 'active']),
      lowStock: numObj(raw, ['products', 'lowStock']),
    },
    orders: {
      total: numObj(raw, ['orders', 'total']),
      pending: numObj(raw, ['orders', 'pending']),
      today: numObj(raw, ['orders', 'today']),
    },
    revenue: {
      total: numObj(raw, ['revenue', 'total']),
      today: numObj(raw, ['revenue', 'today']),
    },
    profit: { total: numObj(raw, ['profit', 'total']) },
  };
}

export async function coreApiShopAdminCreateProduct(body: Record<string, unknown>): Promise<ShopAdminProductRow> {
  const raw = await coreApiRequest<unknown>('/shop/admin/products', { method: 'POST', body });
  const p = parseShopAdminProductRow(raw);
  if (!p) throw new ApiHttpError('Invalid shop admin product response', 500, '');
  return p;
}

export async function coreApiShopAdminUpdateProduct(id: string, body: Record<string, unknown>): Promise<ShopAdminProductRow> {
  const raw = await coreApiRequest<unknown>(`/shop/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body });
  const p = parseShopAdminProductRow(raw);
  if (!p) throw new ApiHttpError('Invalid shop admin product response', 500, '');
  return p;
}

export async function coreApiShopAdminDeleteProduct(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/shop/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiShopAdminUpdateOrderStatus(
  id: string,
  status: string,
  trackingNumber?: string
): Promise<ShopAdminOrderRow> {
  const raw = await coreApiRequest<unknown>(`/shop/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: { status, trackingNumber },
  });
  const p = parseShopAdminOrderRow(raw);
  if (!p) throw new ApiHttpError('Invalid shop admin order response', 500, '');
  return p;
}
