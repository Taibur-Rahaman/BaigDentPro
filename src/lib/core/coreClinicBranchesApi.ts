import { coreApiRequest } from '@/lib/core/coreHttpClient';

export type ClinicBranchRow = { id: string; clinicId: string; name: string; address?: string | null };

export async function coreApiClinicBranches(): Promise<{ branches: ClinicBranchRow[] }> {
  return coreApiRequest<{ branches: ClinicBranchRow[] }>('/clinic/branches', { method: 'GET' });
}

export async function coreApiClinicCreateBranch(body: {
  name: string;
  address?: string | null;
}): Promise<{ branch: { id: string; name: string; address?: string | null } }> {
  return coreApiRequest('/clinic/branches', { method: 'POST', body });
}

export async function coreApiClinicUpdateBranch(
  id: string,
  body: { name?: string; address?: string | null }
): Promise<{ branch: { id: string; name: string; address?: string | null } }> {
  return coreApiRequest(`/clinic/branches/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

export async function coreApiClinicDeleteBranch(id: string): Promise<{ ok: boolean }> {
  return coreApiRequest<{ ok: boolean }>(`/clinic/branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
