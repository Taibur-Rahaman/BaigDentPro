import api from '@/api';
import type { AppUser } from '@/types/appUser';

/** Alias for tenant/API-test consumers; same shape as {@link AppUser} from `/auth/me`. */
export type MeUser = AppUser;

export const userService = {
  me: () => api.auth.me(),
};
