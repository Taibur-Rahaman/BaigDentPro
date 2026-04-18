import { apiRequest } from '@/lib/apiClient';
import { apiRoutes } from '@/services/entityService';

export type MeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  clinicId: string | null;
  clinicName?: string | null;
  isActive?: boolean;
  isApproved?: boolean;
  createdAt?: string;
};

export const userService = {
  me: () => apiRequest(`${apiRoutes.auth}/me`),
};
