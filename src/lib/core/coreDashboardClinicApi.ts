import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import type {
  ClinicActivityLogRow,
  ClinicActivityLogsResponse,
  ClinicSubscriptionPayload,
} from '@/types/clinicWorkspace';
export async function coreApiClinicSubscription(): Promise<ClinicSubscriptionPayload> {
  const raw = await coreApiRequest<unknown>('/clinic/subscription', { method: 'GET' });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid clinic subscription payload', 500, '');
  let clinic: ClinicSubscriptionPayload['clinic'] = null;
  const c = raw.clinic;
  if (c !== null && isRecord(c) && typeof c.id === 'string' && typeof c.name === 'string') {
    clinic = {
      id: c.id,
      name: c.name,
      plan: typeof c.plan === 'string' ? c.plan : '',
      isActive: c.isActive !== false,
    };
  }
  let subscription: Record<string, unknown> | null = null;
  if (raw.subscription !== null && raw.subscription !== undefined && isRecord(raw.subscription)) {
    subscription = raw.subscription;
  }
  return { clinic, subscription };
}

function parseClinicActivityLogRow(row: unknown): ClinicActivityLogRow | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.action !== 'string') return null;
  const u = row.user;
  let user: ClinicActivityLogRow['user'] = null;
  if (isRecord(u) && typeof u.email === 'string' && typeof u.name === 'string' && typeof u.role === 'string') {
    user = {
      id: typeof u.id === 'string' ? u.id : '',
      email: u.email,
      name: u.name,
      role: u.role,
    };
  }
  return {
    id: row.id,
    userId: typeof row.userId === 'string' ? row.userId : '',
    action: row.action,
    entity: row.entity === null || typeof row.entity === 'string' ? row.entity : null,
    entityId: row.entityId === null || typeof row.entityId === 'string' ? row.entityId : null,
    details: row.details === null || typeof row.details === 'string' ? row.details : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    user,
  };
}

export async function coreApiClinicActivityLogs(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<ClinicActivityLogsResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.userId) q.set('userId', params.userId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(
    `/clinic/activity-logs${qs ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
  if (!isRecord(raw) || !Array.isArray(raw.logs)) {
    throw new ApiHttpError('Invalid clinic activity logs response', 500, '');
  }
  const logs = raw.logs.map(parseClinicActivityLogRow).filter((l): l is ClinicActivityLogRow => l !== null);
  return {
    logs,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}
