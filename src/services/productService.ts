import api from '@/api';
import type { SaasProduct } from '@/types/tenantSaas';

export type { SaasProduct } from '@/types/tenantSaas';

export const productService = {
  list: (): Promise<SaasProduct[]> => api.tenantProducts.list(),
  get: (id: string): Promise<SaasProduct> => api.tenantProducts.get(id),
  uploadImage: (file: File): Promise<string> => api.tenantProducts.uploadImage(file),
  create: (name: string, price: number, costPrice = 0, imageUrl?: string | null) =>
    api.tenantProducts.create(name, price, costPrice, imageUrl),
  update: (id: string, name: string, price: number, costPrice?: number) =>
    api.tenantProducts.update(id, name, price, costPrice),
  remove: (id: string): Promise<void> => api.tenantProducts.remove(id),
};
