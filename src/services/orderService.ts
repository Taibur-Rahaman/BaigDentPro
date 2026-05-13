import api from '@/api';
import type { SaasOrder } from '@/types/tenantSaas';

export type {
  SaasOrder,
  SaasOrderItem,
  SaasOrderProduct,
  SaasOrderProfit,
  SaasOrderTransaction,
} from '@/types/tenantSaas';

export const orderService = {
  list: (): Promise<SaasOrder[]> => api.tenantOrders.list(),
  get: (id: string): Promise<SaasOrder> => api.tenantOrders.get(id),
  create: (productId: string, quantity: number): Promise<SaasOrder> =>
    api.tenantOrders.create(productId, quantity),
  remove: (id: string): Promise<void> => api.tenantOrders.remove(id),
};
