import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';

export type ShopProductListRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  category?: string;
  isActive?: boolean;
};

export type ShopProductListPayload = { products: ShopProductListRow[]; total: number };

function parseProductRow(row: unknown): ShopProductListRow | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    slug: typeof row.slug === 'string' ? row.slug : row.id,
    price: numField(row, 'price'),
    stock: numField(row, 'stock'),
    category: typeof row.category === 'string' ? row.category : undefined,
    isActive: typeof row.isActive === 'boolean' ? row.isActive : undefined,
  };
}

export async function coreApiShopProductsList(params?: {
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
}): Promise<ShopProductListPayload> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.featured) query.set('featured', 'true');
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  const raw = await coreApiRequest<unknown>(`/shop/products?${qs}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.products)) {
    throw new ApiHttpError('Invalid shop products response', 500, '');
  }
  const products = raw.products.map(parseProductRow).filter((x): x is ShopProductListRow => x !== null);
  return { products, total: numField(raw, 'total') };
}

export type ShopProductBySlugPayload = ShopProductListRow & Record<string, unknown>;

export async function coreApiShopProductBySlug(slug: string): Promise<ShopProductBySlugPayload> {
  const raw = await coreApiRequest<unknown>(`/shop/products/${encodeURIComponent(slug)}`, { method: 'GET' });
  const base = parseProductRow(raw);
  if (!base || !isRecord(raw)) throw new ApiHttpError('Invalid shop product response', 500, '');
  return { ...raw, ...base } as ShopProductBySlugPayload;
}

export type ShopCartItemRow = {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
  lineTotal?: number;
};

export type ShopCartPayload = { sessionId: string; items: ShopCartItemRow[]; total: number };

function parseCartItem(row: unknown): ShopCartItemRow | null {
  if (!isRecord(row) || typeof row.productId !== 'string') return null;
  return {
    productId: row.productId,
    quantity: numField(row, 'quantity') || 0,
    name: typeof row.name === 'string' ? row.name : undefined,
    price: typeof row.price === 'number' ? row.price : undefined,
    lineTotal: typeof row.lineTotal === 'number' ? row.lineTotal : undefined,
  };
}

export async function coreApiShopCart(): Promise<ShopCartPayload> {
  const raw = await coreApiRequest<unknown>('/shop/cart', { method: 'GET' });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid cart response', 500, '');
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(parseCartItem).filter((x): x is ShopCartItemRow => x !== null)
    : [];
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  return { sessionId, items, total: numField(raw, 'total') };
}

export async function coreApiShopCartAdd(productId: string, quantity?: number): Promise<ShopCartPayload> {
  const raw = await coreApiRequest<unknown>('/shop/cart/add', {
    method: 'POST',
    body: { productId, quantity },
  });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid cart response', 500, '');
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(parseCartItem).filter((x): x is ShopCartItemRow => x !== null)
    : [];
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  return { sessionId, items, total: numField(raw, 'total') };
}

export async function coreApiShopCartUpdate(productId: string, quantity: number): Promise<ShopCartPayload> {
  const raw = await coreApiRequest<unknown>('/shop/cart/update', {
    method: 'PUT',
    body: { productId, quantity },
  });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid cart response', 500, '');
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(parseCartItem).filter((x): x is ShopCartItemRow => x !== null)
    : [];
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  return { sessionId, items, total: numField(raw, 'total') };
}

export async function coreApiShopCartRemove(productId: string): Promise<ShopCartPayload> {
  const raw = await coreApiRequest<unknown>(`/shop/cart/remove/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid cart response', 500, '');
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(parseCartItem).filter((x): x is ShopCartItemRow => x !== null)
    : [];
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  return { sessionId, items, total: numField(raw, 'total') };
}

export async function coreApiShopCartClear(): Promise<ShopCartPayload> {
  const raw = await coreApiRequest<unknown>('/shop/cart/clear', { method: 'DELETE' });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid cart response', 500, '');
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(parseCartItem).filter((x): x is ShopCartItemRow => x !== null)
    : [];
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  return { sessionId, items, total: numField(raw, 'total') };
}

export async function coreApiShopCheckout(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>('/shop/checkout', { method: 'POST', body });
}

export type ShopOrderPayload = Record<string, unknown> & { orderNo?: string; id?: string };

export async function coreApiShopOrder(orderNo: string): Promise<ShopOrderPayload> {
  return coreApiRequest<ShopOrderPayload>(`/shop/orders/${encodeURIComponent(orderNo)}`, { method: 'GET' });
}

export async function coreApiShopOrdersByPhone(phone: string): Promise<ShopOrderPayload[]> {
  const raw = await coreApiRequest<unknown>(`/shop/orders/phone/${encodeURIComponent(phone)}`, { method: 'GET' });
  if (!Array.isArray(raw)) throw new ApiHttpError('Invalid orders response', 500, '');
  return raw.filter((x): x is ShopOrderPayload => isRecord(x));
}
