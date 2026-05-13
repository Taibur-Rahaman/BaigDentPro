import { coreApiRequest } from '@/lib/core/coreHttpClient';

export async function coreApiAdminCreateUser(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>('/admin/users', { method: 'POST', body });
}

export async function coreApiAdminUpdateUser(
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

export async function coreApiAdminRevokeUserSessions(id: string): Promise<{ ok: boolean }> {
  return coreApiRequest<{ ok: boolean }>(`/admin/users/${encodeURIComponent(id)}/revoke-sessions`, {
    method: 'POST',
    body: {},
  });
}
