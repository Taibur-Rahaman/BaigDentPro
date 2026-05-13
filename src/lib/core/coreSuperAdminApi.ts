import { ApiHttpError } from '@/lib/apiErrors';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import type { SuperAdminStats } from '@/types/superAdmin';

function parseSuperAdminStats(raw: unknown): SuperAdminStats {
  if (!isRecord(raw)) throw new ApiHttpError('Invalid super admin stats', 500, '');
  const keys = [
    'totalClinics',
    'totalPatients',
    'totalAppointments',
    'totalPrescriptions',
    'totalRevenue',
    'activityLogCount',
  ] as const;
  const out: Partial<SuperAdminStats> = {};
  for (const k of keys) {
    const v = raw[k];
    if (typeof v !== 'number' || Number.isNaN(v)) {
      throw new ApiHttpError(`Invalid super admin stats field: ${k}`, 500, '');
    }
    out[k] = v;
  }
  return out as SuperAdminStats;
}

export async function coreApiSuperAdminPendingSignups(): Promise<{
  pending: Record<string, unknown>[];
  count: number;
}> {
  const raw = await coreApiRequest<unknown>('/super-admin/pending-signups', { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.pending)) {
    throw new ApiHttpError('Invalid pending signups response', 500, '');
  }
  return {
    pending: raw.pending.filter((x): x is Record<string, unknown> => isRecord(x)),
    count: numField(raw, 'count'),
  };
}

export type ApproveSignupPayload = {
  role?:
    | 'CLINIC_ADMIN'
    | 'CLINIC_OWNER'
    | 'DOCTOR'
    | 'STORE_MANAGER'
    | 'RECEPTIONIST'
    | 'LAB_TECH'
    | 'DENTAL_ASSISTANT';
  title?: string | null;
  degree?: string | null;
  specialization?: string | null;
  professionalVerified?: boolean;
  catalogPlanName?: 'FREE' | 'PLATINUM' | 'PREMIUM' | 'LUXURY';
};

export async function coreApiSuperAdminApproveSignup(
  userId: string,
  body: ApproveSignupPayload = {}
): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(
    `/super-admin/users/${encodeURIComponent(userId)}/approve-signup`,
    { method: 'POST', body }
  );
  return parseCoreMessageAck(raw);
}

export async function coreApiSuperAdminRejectSignup(userId: string): Promise<{ ok: boolean }> {
  return coreApiRequest<{ ok: boolean }>(`/super-admin/users/${encodeURIComponent(userId)}/reject-signup`, {
    method: 'POST',
  });
}

export async function coreApiSuperAdminStats(): Promise<SuperAdminStats> {
  const raw = await coreApiRequest<unknown>('/super-admin/stats', { method: 'GET' });
  return parseSuperAdminStats(raw);
}

export async function coreApiSuperAdminDemoReset(): Promise<{ ok: boolean; clinicsReset: number }> {
  return coreApiRequest<{ ok: boolean; clinicsReset: number }>('/super-admin/demo/reset', { method: 'POST' });
}

export async function coreApiSuperAdminClinics(params?: { search?: string; page?: number; limit?: number }): Promise<{
  clinics: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search ?? '');
  if (params?.page) query.set('page', String(params.page ?? 1));
  if (params?.limit) query.set('limit', String(params.limit ?? 20));
  const raw = await coreApiRequest<unknown>(`/super-admin/clinics?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.clinics)) {
    throw new ApiHttpError('Invalid clinics response', 500, '');
  }
  return {
    clinics: raw.clinics.filter((x): x is Record<string, unknown> => isRecord(x)),
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

export async function coreApiSuperAdminRevenueByBranch(params?: { startDate?: string; endDate?: string }): Promise<{
  branches: Record<string, unknown>[];
  start: string;
  end: string;
}> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  const raw = await coreApiRequest<unknown>(`/super-admin/revenue-by-branch?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.branches)) {
    throw new ApiHttpError('Invalid revenue response', 500, '');
  }
  return {
    branches: raw.branches.filter((x): x is Record<string, unknown> => isRecord(x)),
    start: typeof raw.start === 'string' ? raw.start : '',
    end: typeof raw.end === 'string' ? raw.end : '',
  };
}

export async function coreApiSuperAdminChairUtilization(params?: { startDate?: string; endDate?: string }): Promise<{
  utilization: Record<string, unknown>[];
  start: string;
  end: string;
}> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  const raw = await coreApiRequest<unknown>(`/super-admin/chair-utilization?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.utilization)) {
    throw new ApiHttpError('Invalid utilization response', 500, '');
  }
  return {
    utilization: raw.utilization.filter((x): x is Record<string, unknown> => isRecord(x)),
    start: typeof raw.start === 'string' ? raw.start : '',
    end: typeof raw.end === 'string' ? raw.end : '',
  };
}

export async function coreApiSuperAdminActivityLogs(params?: {
  userId?: string;
  action?: string;
  entity?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.userId) query.set('userId', params.userId);
  if (params?.action) query.set('action', params.action);
  if (params?.entity) query.set('entity', params.entity);
  if (params?.page) query.set('page', String(params?.page ?? 1));
  if (params?.limit) query.set('limit', String(params?.limit ?? 50));
  const raw = await coreApiRequest<unknown>(`/super-admin/activity-logs?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.logs)) {
    throw new ApiHttpError('Invalid activity logs response', 500, '');
  }
  return {
    logs: raw.logs.filter((x): x is Record<string, unknown> => isRecord(x)),
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}

export async function coreApiSuperAdminDoctors(params?: {
  search?: string;
  clinicId?: string;
  page?: number;
  limit?: number;
}): Promise<{ doctors: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.clinicId) query.set('clinicId', params.clinicId);
  if (params?.page) query.set('page', String(params?.page ?? 1));
  if (params?.limit) query.set('limit', String(params?.limit ?? 20));
  const raw = await coreApiRequest<unknown>(`/super-admin/doctors?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.doctors)) {
    throw new ApiHttpError('Invalid doctors response', 500, '');
  }
  return {
    doctors: raw.doctors.filter((x): x is Record<string, unknown> => isRecord(x)),
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

export async function coreApiSuperAdminUpdateDoctor(
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/super-admin/doctors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function coreApiSuperAdminPatients(params?: {
  search?: string;
  doctorId?: string;
  page?: number;
  limit?: number;
}): Promise<{ patients: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.doctorId) query.set('doctorId', params.doctorId);
  if (params?.page) query.set('page', String(params?.page ?? 1));
  if (params?.limit) query.set('limit', String(params?.limit ?? 20));
  const raw = await coreApiRequest<unknown>(`/super-admin/patients?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.patients)) {
    throw new ApiHttpError('Invalid patients response', 500, '');
  }
  return {
    patients: raw.patients.filter((x): x is Record<string, unknown> => isRecord(x)),
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

export async function coreApiSuperAdminUpdatePatient(
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/super-admin/patients/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function coreApiSuperAdminPrescriptions(params?: {
  doctorId?: string;
  patientId?: string;
  page?: number;
  limit?: number;
}): Promise<{ prescriptions: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.doctorId) query.set('doctorId', params.doctorId);
  if (params?.patientId) query.set('patientId', params.patientId);
  if (params?.page) query.set('page', String(params?.page ?? 1));
  if (params?.limit) query.set('limit', String(params?.limit ?? 20));
  const raw = await coreApiRequest<unknown>(`/super-admin/prescriptions?${query}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.prescriptions)) {
    throw new ApiHttpError('Invalid prescriptions response', 500, '');
  }
  return {
    prescriptions: raw.prescriptions.filter((x): x is Record<string, unknown> => isRecord(x)),
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 20,
  };
}

export async function coreApiSuperAdminUpdatePrescription(
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return coreApiRequest<Record<string, unknown>>(`/super-admin/prescriptions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export type CapabilityCatalogRow = {
  key: string;
  requiresProductFeature: string | null;
};

export async function coreApiSuperAdminCapabilitiesCatalog(): Promise<{ capabilities: CapabilityCatalogRow[] }> {
  const raw = await coreApiRequest<unknown>('/super-admin/capabilities/catalog', { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.capabilities)) {
    throw new ApiHttpError('Invalid capabilities catalog', 500, '');
  }
  const capabilities = raw.capabilities
    .filter((x): x is Record<string, unknown> => isRecord(x))
    .map((row) => {
      const key = typeof row.key === 'string' ? row.key : '';
      const req = row.requiresProductFeature;
      const requiresProductFeature =
        req === null ? null : typeof req === 'string' ? req : null;
      return { key, requiresProductFeature };
    })
    .filter((r) => r.key.length > 0);
  return { capabilities };
}

export async function coreApiSuperAdminGetClinicCapabilityOverrides(clinicId: string): Promise<{
  clinicId: string;
  overrides: { capabilityKey: string; grant: boolean }[];
}> {
  const raw = await coreApiRequest<unknown>(
    `/super-admin/clinics/${encodeURIComponent(clinicId)}/capability-overrides`,
    { method: 'GET' }
  );
  if (!isRecord(raw) || !Array.isArray(raw.overrides)) {
    throw new ApiHttpError('Invalid capability overrides response', 500, '');
  }
  const overrides = raw.overrides
    .filter((x): x is Record<string, unknown> => isRecord(x))
    .map((o) => ({
      capabilityKey: String(o.capabilityKey ?? ''),
      grant: Boolean(o.grant),
    }))
    .filter((o) => o.capabilityKey.length > 0);
  return { clinicId: String(raw.clinicId ?? clinicId), overrides };
}

export async function coreApiSuperAdminPutClinicCapabilityOverrides(
  clinicId: string,
  overrides: { capabilityKey: string; grant: boolean }[]
): Promise<{ ok: boolean; clinicId: string; count: number }> {
  return coreApiRequest<{ ok: boolean; clinicId: string; count: number }>(
    `/super-admin/clinics/${encodeURIComponent(clinicId)}/capability-overrides`,
    { method: 'PUT', body: { overrides } }
  );
}
