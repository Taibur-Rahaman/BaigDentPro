import api from '@/api';

export const diagnosticsService = {
  tenantStatus: () => api.diagnostics.tenantStatus(),
};
