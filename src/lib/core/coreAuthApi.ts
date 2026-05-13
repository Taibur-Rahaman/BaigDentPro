import { AUTH_LOGIN_URL } from '@/config/api';
import {
  ApiHttpError,
  LoginEmptySuccessBodyError,
  LoginExpectedJsonBodyError,
} from '@/lib/apiErrors';
import {
  coreApiRequest,
  executeCanonicalJsonTransport,
  buildAuthHeaders,
  type JsonTransportResult,
  rethrowSafeFetchFailure,
} from '@/lib/core/coreHttpClient';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import {
  clearCoreApiSession,
  getRefreshToken,
  persistAuthTokensFromResponse,
} from '@/lib/core/coreAuthStorage';
import type { AppUser } from '@/types/appUser';
import { parseTenant } from '@/types/tenant';

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

export function buildAppUserFromAuthPayload(user: unknown, rootTenant?: unknown): AppUser | null {
  if (!user || typeof user !== 'object' || user === null) return null;
  const o = user as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;
  const tenantRaw = rootTenant !== undefined ? rootTenant : o.tenant;
  const tenant = parseTenant(tenantRaw);
  return {
    id: o.id,
    email: typeof o.email === 'string' ? o.email : '',
    name: typeof o.name === 'string' ? o.name : '',
    role: typeof o.role === 'string' ? o.role : '',
    clinicId:
      o.clinicId === null || o.clinicId === undefined
        ? null
        : typeof o.clinicId === 'string'
          ? o.clinicId
          : null,
    phone: o.phone === null ? null : typeof o.phone === 'string' ? o.phone : undefined,
    clinicName: o.clinicName === null ? null : typeof o.clinicName === 'string' ? o.clinicName : undefined,
    title: o.title === null ? null : typeof o.title === 'string' ? o.title : undefined,
    degree: o.degree === null ? null : typeof o.degree === 'string' ? o.degree : undefined,
    specialization:
      o.specialization === null ? null : typeof o.specialization === 'string' ? o.specialization : undefined,
    professionalVerified:
      typeof o.professionalVerified === 'boolean' ? o.professionalVerified : undefined,
    professionalVerifiedAt:
      typeof o.professionalVerifiedAt === 'string' ? o.professionalVerifiedAt : undefined,
    clinicAddress: o.clinicAddress === null ? null : typeof o.clinicAddress === 'string' ? o.clinicAddress : undefined,
    clinicPhone: o.clinicPhone === null ? null : typeof o.clinicPhone === 'string' ? o.clinicPhone : undefined,
    licenseNo: o.licenseNo === null ? null : typeof o.licenseNo === 'string' ? o.licenseNo : undefined,
    isActive: typeof o.isActive === 'boolean' ? o.isActive : undefined,
    isApproved: typeof o.isApproved === 'boolean' ? o.isApproved : undefined,
    accountStatus: typeof o.accountStatus === 'string' ? o.accountStatus : undefined,
    tenant,
  };
}

function finalizeLoginPack(
  pack: JsonTransportResult<
    { user: unknown; token: string; refreshToken?: string; tenant?: unknown } | { error?: string }
  >
): { user: unknown; token: string; refreshToken?: string; tenant?: unknown } {
  const { response, rawText, data } = pack;
  const status = response.status;

  if (!response.ok) {
    if (status === 401 || status === 404) {
      throw new ApiHttpError('Invalid credentials', status, rawText);
    }
    if (status >= 500) {
      throw new ApiHttpError('Server error', status, rawText);
    }
    throw new ApiHttpError('Invalid credentials', status, rawText);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new LoginEmptySuccessBodyError();
  }
  if (data === undefined) {
    throw new LoginExpectedJsonBodyError();
  }

  const out = data as { user?: unknown; token?: string };
  const tokenVal = typeof out.token === 'string' ? out.token : '';
  if (!tokenVal) {
    throw new LoginEmptySuccessBodyError();
  }
  return data as { user: unknown; token: string; refreshToken?: string; tenant?: unknown };
}

export async function coreApiLogin(
  email: string,
  password: string
): Promise<{ user: AppUser; token: string; refreshToken?: string; tenant?: unknown }> {
  let pack: JsonTransportResult<
    { user: unknown; token: string; refreshToken?: string; tenant?: unknown } | { error?: string }
  >;
  try {
    pack = await executeCanonicalJsonTransport(AUTH_LOGIN_URL, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    rethrowSafeFetchFailure(err);
  }

  if (DEBUG_API) {
    console.log('[LOGIN]', AUTH_LOGIN_URL);
  }

  const finalized = finalizeLoginPack(pack);
  persistAuthTokensFromResponse(finalized);
  const user = buildAppUserFromAuthPayload(finalized.user, finalized.tenant);
  if (!user) {
    throw new LoginEmptySuccessBodyError();
  }
  return { ...finalized, user };
}

export async function coreApiAuthMe(): Promise<AppUser | null> {
  const raw = await coreApiRequest<unknown>('/auth/me', { method: 'GET' });
  let merged: unknown = raw;
  if (raw && typeof raw === 'object' && raw !== null && 'success' in raw) {
    const r = raw as { success?: unknown; user?: unknown; tenant?: unknown };
    if (r.success === true && r.user && typeof r.user === 'object') {
      merged = { ...(r.user as Record<string, unknown>), tenant: r.tenant ?? null };
    }
  }
  return buildAppUserFromAuthPayload(merged);
}

export async function coreApiAuthRegister(data: {
  email: string;
  password: string;
  name: string;
  clinicName?: string;
  phone?: string;
  title?: string;
  degree?: string;
}): Promise<{
  user: unknown;
  token?: string;
  pendingApproval?: boolean;
  message?: string;
}> {
  const result = await coreApiRequest<{
    user: unknown;
    token?: string;
    pendingApproval?: boolean;
    message?: string;
  }>('/auth/register', { method: 'POST', body: data });
  persistAuthTokensFromResponse(result);
  return result;
}

export async function coreApiAuthRegisterSaas(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{
  user: AppUser;
  token?: string;
  refreshToken?: string;
  message?: string;
}> {
  const result = await coreApiRequest<{
    user: unknown;
    token?: string;
    refreshToken?: string;
    pendingApproval?: boolean;
    tenant?: unknown;
    message?: string;
  }>('/auth/register', {
    method: 'POST',
    body: {
      email: data.email,
      password: data.password,
      name: data.name ?? data.email.split('@')[0] ?? 'User',
      clinicName: data.name ?? undefined,
    },
  });
  persistAuthTokensFromResponse(result);
  const user = buildAppUserFromAuthPayload(result.user, result.tenant);
  if (!user) {
    throw new ApiHttpError('Invalid user payload from server', 500, '');
  }
  return {
    user,
    token: result.token,
    refreshToken: result.refreshToken,
    message: result.message,
  };
}

export async function coreApiLogoutAllDevices(): Promise<void> {
  try {
    await coreApiRequest<{ success?: boolean }>('/auth/logout-all', { method: 'POST', body: {} }, false);
  } catch {
    /* still clear local session */
  }
  clearCoreApiSession(true);
}

export async function coreApiSyncPrismaPassword(
  accessToken: string,
  password: string
): Promise<{ message: string }> {
  const t = accessToken?.trim();
  if (!t) {
    throw new Error('accessToken required');
  }
  return coreApiRequest<{ message: string }>('/auth/sync-prisma-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}` },
    body: { password },
  });
}

export async function coreApiManualRefreshSession(): Promise<{
  user: unknown;
  token: string;
  refreshToken?: string;
}> {
  const rt = getRefreshToken();
  if (!rt) {
    clearCoreApiSession(true);
    throw new Error('No refresh token');
  }
  const result = await coreApiRequest<{ user: unknown; token: string; refreshToken?: string }>(
    '/auth/refresh',
    { method: 'POST', body: { refreshToken: rt } },
    false
  );
  persistAuthTokensFromResponse(result);
  return result;
}

export async function coreApiRemoteLogout(): Promise<void> {
  const refreshToken = getRefreshToken() || undefined;
  try {
    await coreApiRequest<{ success?: boolean }>(
      '/auth/logout',
      { method: 'POST', body: { refreshToken } },
      false
    );
  } catch {
    /* still clear client session */
  }
  clearCoreApiSession(false);
}

/** Server returns updated user JSON (no `{ success, data }` wrapper). */
export type AuthProfileResponse = {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  clinicEmail: string | null;
  degree: string | null;
  specialization: string | null;
  licenseNo: string | null;
};

function parseAuthProfileResponse(raw: unknown): AuthProfileResponse {
  if (!raw || typeof raw !== 'object' || raw === null) {
    throw new ApiHttpError('Invalid profile response', 500, '');
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.email !== 'string' || typeof r.name !== 'string' || typeof r.role !== 'string') {
    throw new ApiHttpError('Invalid profile response', 500, '');
  }
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    clinicName: r.clinicName === null || typeof r.clinicName === 'string' ? (r.clinicName as string | null) : null,
    clinicAddress: r.clinicAddress === null || typeof r.clinicAddress === 'string' ? (r.clinicAddress as string | null) : null,
    clinicPhone: r.clinicPhone === null || typeof r.clinicPhone === 'string' ? (r.clinicPhone as string | null) : null,
    clinicEmail: r.clinicEmail === null || typeof r.clinicEmail === 'string' ? (r.clinicEmail as string | null) : null,
    degree: r.degree === null || typeof r.degree === 'string' ? (r.degree as string | null) : null,
    specialization: r.specialization === null || typeof r.specialization === 'string' ? (r.specialization as string | null) : null,
    licenseNo: r.licenseNo === null || typeof r.licenseNo === 'string' ? (r.licenseNo as string | null) : null,
  };
}

export async function coreApiAuthUpdateProfile(body: Record<string, unknown>): Promise<AuthProfileResponse> {
  const raw = await coreApiRequest<unknown>('/auth/profile', { method: 'PUT', body });
  return parseAuthProfileResponse(raw);
}

export async function coreApiAuthChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>('/auth/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
  return parseCoreMessageAck(raw);
}
