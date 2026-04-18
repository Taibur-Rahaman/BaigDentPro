import { apiRequest } from '@/lib/apiClient';

/** Authenticated `GET /api/test/status` — DB, Supabase, and catalog probe (no legacy `test_table`). */
export const diagnosticsService = {
  tenantStatus: () => apiRequest('/api/test/status'),
};
