/**
 * Patient portal HTTP transport — separate JWT space from staff `coreApiRequest`.
 * Uses {@link executeCanonicalJsonTransport} (single fetch host).
 */
import { API_BASE, API_TIMEOUT_MS } from '@/config/api';
import { ApiHttpError, parseApiErrorBody } from '@/lib/apiErrors';
import {
  executeCanonicalJsonTransport,
  rethrowSafeFetchFailure,
} from '@/lib/core/coreHttpClient';
import {
  clearPatientPortalSession,
  getPatientPortalAccessToken,
  getPatientPortalRefreshToken,
  setPatientPortalAccessToken,
  setPatientPortalRefreshToken,
} from '@/lib/core/corePatientPortalAuthStorage';

function buildUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (path.startsWith('/api')) {
    throw new Error(`Invalid path ${path}: omit /api — use paths relative to API_BASE`);
  }
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

async function rotatePatientPortalRefresh(): Promise<boolean> {
  const rt = getPatientPortalRefreshToken()?.trim();
  if (!rt) return false;
  const url = buildUrl('/patient-portal/auth/refresh');
  try {
    const { response, data } = await executeCanonicalJsonTransport<{ token?: string; refreshToken?: string }>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!response.ok) return false;
    if (data?.token) setPatientPortalAccessToken(data.token);
    if (data?.refreshToken) setPatientPortalRefreshToken(data.refreshToken);
    return Boolean(data?.token);
  } catch {
    return false;
  }
}

export type PatientPortalApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export async function patientPortalApiRequest<T>(
  endpoint: string,
  options: PatientPortalApiOptions = {},
  allowRefreshRetry = true
): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = buildUrl(path);
  const method = options.method ?? 'GET';
  const hadToken = Boolean(getPatientPortalAccessToken()?.trim());
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bearer = getPatientPortalAccessToken()?.trim();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const timeoutController = new AbortController();
  const timeoutId =
    typeof window !== 'undefined' ? window.setTimeout(() => timeoutController.abort(), API_TIMEOUT_MS) : 0;
  const body =
    options.body === undefined
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

  let pack: Awaited<ReturnType<typeof executeCanonicalJsonTransport<T | { error?: string }>>>;
  try {
    pack = await executeCanonicalJsonTransport<T | { error?: string }>(fullUrl, {
      method,
      headers,
      body,
      signal: options.signal ?? timeoutController.signal,
    });
  } catch (e) {
    if (typeof window !== 'undefined') window.clearTimeout(timeoutId);
    rethrowSafeFetchFailure(e);
  }
  if (typeof window !== 'undefined') window.clearTimeout(timeoutId);

  const { response, rawText, data } = pack;
  if (!response.ok) {
    const message = parseApiErrorBody(rawText) ?? `Request failed (${response.status})`;
    if (
      response.status === 401 &&
      allowRefreshRetry &&
      hadToken &&
      !path.includes('/patient-portal/auth/refresh')
    ) {
      const rotated = await rotatePatientPortalRefresh();
      if (rotated) return patientPortalApiRequest<T>(endpoint, options, false);
    }
    if (response.status === 401) clearPatientPortalSession();
    throw new ApiHttpError(message, response.status, rawText);
  }

  if (!rawText.trim()) return null as T;
  if (data === undefined) {
    throw new ApiHttpError('Invalid patient portal response body', response.status, rawText);
  }
  return data as T;
}
