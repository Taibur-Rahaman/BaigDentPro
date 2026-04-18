import { apiRequest } from '@/lib/apiClient';
import { apiRoutes } from '@/services/entityService';

export type SaasOrderProduct = {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  imageUrl?: string | null;
};

export type SaasOrderProfit = { id: string; amount: number; createdAt?: string };

export type SaasOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productName?: string | null;
  product?: SaasOrderProduct;
};

export type SaasOrderTransaction = {
  id: string;
  amount: number;
  status: string;
  currency: string;
  createdAt?: string;
};

export type SaasOrder = {
  id: string;
  clinicId: string;
  currency: string;
  status: string;
  subtotal: number;
  total: number;
  paymentStatus: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: SaasOrderItem[];
  profit?: SaasOrderProfit | null;
  transactions?: SaasOrderTransaction[];
};

export const orderService = {
  list: () => apiRequest(`${apiRoutes.orders}`),
  get: (id: string) => apiRequest(`${apiRoutes.orders}/${encodeURIComponent(id)}`),
  create: (productId: string, quantity: number) =>
    apiRequest(`${apiRoutes.orders}`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  remove: (id: string) =>
    apiRequest(`${apiRoutes.orders}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
