import { ApiHttpError } from '@/lib/apiErrors';
import { isRecord } from '@/lib/core/domainShared';
import { patientPortalApiRequest } from '@/lib/core/corePatientPortalHttp';
import {
  clearPatientPortalSession,
  getPatientPortalRefreshToken,
  setPatientPortalAccessToken,
  setPatientPortalRefreshToken,
} from '@/lib/core/corePatientPortalAuthStorage';

export async function corePatientPortalRequestOtp(body: {
  phone: string;
  clinicId: string;
}): Promise<{ ok: boolean; expiresInSec: number; devCode?: string }> {
  return patientPortalApiRequest('/patient-portal/auth/request-otp', { method: 'POST', body });
}

export async function corePatientPortalVerifyOtp(body: {
  phone: string;
  clinicId: string;
  code: string;
}): Promise<{
  token: string;
  refreshToken: string;
  patient: { id: string; name: string; clinicId: string };
}> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/auth/verify-otp', { method: 'POST', body });
  if (!isRecord(raw) || typeof raw.token !== 'string' || typeof raw.refreshToken !== 'string') {
    throw new ApiHttpError('Invalid verify-otp response', 500, '');
  }
  setPatientPortalAccessToken(raw.token);
  setPatientPortalRefreshToken(raw.refreshToken);
  const p = raw.patient;
  if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.clinicId !== 'string') {
    throw new ApiHttpError('Invalid verify-otp patient payload', 500, '');
  }
  return {
    token: raw.token,
    refreshToken: raw.refreshToken,
    patient: { id: p.id, name: p.name, clinicId: p.clinicId },
  };
}

export async function corePatientPortalRefresh(): Promise<{ token: string; refreshToken: string }> {
  const rt = getPatientPortalRefreshToken()?.trim();
  if (!rt) throw new ApiHttpError('No refresh token', 401, '');
  const raw = await patientPortalApiRequest<unknown>(
    '/patient-portal/auth/refresh',
    { method: 'POST', body: { refreshToken: rt } },
    false
  );
  if (!isRecord(raw) || typeof raw.token !== 'string' || typeof raw.refreshToken !== 'string') {
    throw new ApiHttpError('Invalid refresh response', 500, '');
  }
  setPatientPortalAccessToken(raw.token);
  setPatientPortalRefreshToken(raw.refreshToken);
  return { token: raw.token, refreshToken: raw.refreshToken };
}

export function corePatientPortalLogout(): void {
  clearPatientPortalSession();
}
