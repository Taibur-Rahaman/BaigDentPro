import { AUTH_LOGIN_URL, AUTH_LOGIN_TIMEOUT_MS } from '@/config/api';
import { fetchApiHealthSnapshot } from '@/lib/apiHealthPreflight';
import {
  ApiHttpError,
  isApiHttpError,
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
  clearAuthForCredentialLogin,
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
      const parsed = typeof rawText === 'string' ? rawText : '';
      let msg = 'Server error';
      try {
        const j = JSON.parse(parsed) as { error?: string };
        if (typeof j.error === 'string' && j.error.trim()) msg = j.error.trim();
      } catch {
        /* ignore */
      }
      throw new ApiHttpError(msg, status, rawText);
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

function isLoginRetryable503(err: unknown): boolean {
  if (!isApiHttpError(err) || err.status !== 503) return false;
  const body = (err.rawBody || err.message || '').toLowerCase();
  return body.includes('database') || body.includes('db_busy') || body.includes('busy');
}

function isLoginRetryable(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return false;
  if (err instanceof Error && /aborted|timeout/i.test(err.message)) return false;
  if (isLoginRetryable503(err)) return true;
  return err instanceof TypeError;
}

let loginInFlight: Promise<{ user: AppUser; token: string; refreshToken?: string; tenant?: unknown }> | null =
  null;

function loginTransportSignal(userSignal?: AbortSignal): AbortSignal | undefined {
  if (typeof window === 'undefined') return userSignal;
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), AUTH_LOGIN_TIMEOUT_MS);
  if (!userSignal) {
    return timeoutController.signal;
  }
  userSignal.addEventListener('abort', () => {
    window.clearTimeout(timeoutId);
    timeoutController.abort();
  }, { once: true });
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([userSignal, timeoutController.signal]);
  }
  return timeoutController.signal;
}

async function coreApiLoginAttempt(
  email: string,
  password: string,
  options: { signal?: AbortSignal },
): Promise<{ user: AppUser; token: string; refreshToken?: string; tenant?: unknown }> {
  clearAuthForCredentialLogin();

  const health = await fetchApiHealthSnapshot(options.signal);
  if (!health.ok) {
    const msg =
      health.database === 'error' || health.status === 'degraded'
        ? 'Database not connected'
        : 'API unreachable';
    throw new ApiHttpError(msg, 503, '');
  }

  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const pack = await executeCanonicalJsonTransport(AUTH_LOGIN_URL, {
        method: 'POST',
        headers: await buildAuthHeaders({}, { omitAuth: true }),
        body: JSON.stringify({ email, password }),
        signal: loginTransportSignal(options.signal),
      });

      if (DEBUG_API) {
        console.log('[LOGIN]', AUTH_LOGIN_URL, attempt > 0 ? `(retry ${attempt + 1})` : '');
      }

      const finalized = finalizeLoginPack(pack);
      persistAuthTokensFromResponse(finalized);
      const user = buildAppUserFromAuthPayload(finalized.user, finalized.tenant);
      if (!user) {
        throw new LoginEmptySuccessBodyError();
      }
      return { ...finalized, user };
    } catch (err) {
      if (attempt < maxAttempts - 1 && isLoginRetryable(err)) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (
        isApiHttpError(err) ||
        err instanceof LoginEmptySuccessBodyError ||
        err instanceof LoginExpectedJsonBodyError
      ) {
        throw err;
      }
      rethrowSafeFetchFailure(err);
    }
  }
  throw new ApiHttpError('Sign-in failed', 503, '');
}

export async function coreApiLogin(
  email: string,
  password: string,
  options: { signal?: AbortSignal } = {},
): Promise<{ user: AppUser; token: string; refreshToken?: string; tenant?: unknown }> {
  if (loginInFlight) {
    return loginInFlight;
  }
  const run = coreApiLoginAttempt(email, password, options);
  loginInFlight = run;
  try {
    return await run;
  } finally {
    if (loginInFlight === run) {
      loginInFlight = null;
    }
  }
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
