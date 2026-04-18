import { apiRequest } from '@/lib/apiClient';
import { apiRoutes } from '@/services/entityService';

export type SaasProduct = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  imageUrl?: string | null;
  clinicId: string;
  createdAt?: string;
  updatedAt?: string;
};

export const productService = {
  list: () => apiRequest(`${apiRoutes.products}`),
  get: (id: string) => apiRequest(`${apiRoutes.products}/${encodeURIComponent(id)}`),
  create: (name: string, price: number, costPrice = 0, imageUrl?: string | null) =>
    apiRequest(`${apiRoutes.products}`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        price,
        costPrice,
        ...(imageUrl !== undefined && imageUrl !== null && imageUrl !== ''
          ? { imageUrl }
          : {}),
      }),
    }),
  update: (id: string, name: string, price: number, costPrice?: number) =>
    apiRequest(`${apiRoutes.products}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        price,
        ...(costPrice !== undefined ? { costPrice } : {}),
      }),
    }),
  remove: (id: string) =>
    apiRequest(`${apiRoutes.products}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
