/**
 * Sole `fetch` invocation for the SPA API layer + timeout, auth headers, and 401 refresh + single retry.
 */
import {
  API_BASE,
  API_TIMEOUT_MS,
  HTML_API_ERROR,
  getApiHost,
  INVALID_LOGIN_HOST_ERROR,
  LOGIN_RETURNED_HTML_ERROR,
} from '@/config/api';
import {
  ApiHttpError,
  InvalidLoginHostError,
  LoginExpectedJsonBodyError,
  LoginReturnedHtmlError,
  SafeApiJsonParseError,
  parseApiErrorBody,
  userMessageFromUnknown,
} from '@/lib/apiErrors';
import { captureError } from '@/lib/errorHandler';
import { guardApiFetchUrl } from '@/lib/guardApiFetchUrl';
import {
  clearCoreApiSession,
  coreApiBootstrapStorage,
  getAccessToken,
  getRefreshToken,
  getCoreSessionId,
  removeCachedUserSnapshotKey,
  setAccessToken,
  setRefreshToken,
} from '@/lib/core/coreAuthStorage';
import { getSupabaseAccessToken } from '@/lib/supabaseClient';

export type CoreApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface CoreApiOptions {
  method?: CoreApiMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  suppressErrorCapture?: boolean;
  omitAuth?: boolean;
}

export interface CoreApiFormDataOptions {
  method?: CoreApiMethod;
  formData: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type JsonTransportResult<T = unknown> = {
  response: Response;
  rawText: string;
  data?: T;
};

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

let loginTransportCounter = 0;
let refreshInFlight: Promise<boolean> | null = null;
let logoutOnRefreshPipelineFailure: (() => void | Promise<void>) | null = null;

export function setCoreApiRefreshFailedLogoutHandler(handler: (() => void | Promise<void>) | null): void {
  logoutOnRefreshPipelineFailure = handler;
}

function isAuthLoginUrl(url: string): boolean {
  try {
    const p = new URL(url).pathname;
    return p === '/api/auth/login' || p.endsWith('/api/auth/login');
  } catch {
    return false;
  }
}

export async function executeCanonicalJsonTransport<T>(url: string, init?: RequestInit): Promise<JsonTransportResult<T>> {
  const isLogin = isAuthLoginUrl(url);

  if (isLogin) {
    loginTransportCounter += 1;
    if (DEBUG_API) {
      console.log('[LOGIN LOOP]', {
        attempt: loginTransportCounter,
        url,
        origin: typeof window !== 'undefined' ? window.location.hostname : '',
        time: new Date().toISOString(),
      });
    }
    const allowedHost = getApiHost();
    const gotHost = (() => {
      try {
        return new URL(url).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();
    if (!allowedHost || gotHost !== allowedHost) {
      console.error(INVALID_LOGIN_HOST_ERROR, url);
      throw new InvalidLoginHostError();
    }
  }

  guardApiFetchUrl(url);
  if (DEBUG_API) {
    console.log('[API REQUEST]', url);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (DEBUG_API) {
      console.error('[API FETCH FAILED]', url, e);
    } else {
      console.error('[API FETCH FAILED]', e instanceof Error ? e.message : String(e));
    }
    throw e;
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (isLogin && trimmed.startsWith('<')) {
    console.error('[LOGIN HTML LEAK DETECTED]', {
      url,
      status: response.status,
      contentType,
      looksLikeDoctype: trimmed.toLowerCase().startsWith('<!doctype'),
      bodyPreview: rawText.slice(0, 200),
    });
    throw new LoginReturnedHtmlError();
  }

  if (trimmed.startsWith('<')) {
    console.error('[API HTML DETECTED]', {
      url,
      status: response.status,
      preview: rawText.slice(0, 200),
    });
    throw new Error(HTML_API_ERROR);
  }

  if (isLogin && trimmed.length > 0 && !contentType.toLowerCase().includes('application/json')) {
    console.error('[NON JSON RESPONSE]', { url, contentType, status: response.status });
    throw new LoginExpectedJsonBodyError();
  }

  if (!trimmed) {
    return { response, rawText };
  }

  try {
    const data = JSON.parse(rawText) as T;
    return { response, data, rawText };
  } catch {
    if (!response.ok) {
      return { response, rawText };
    }
    console.error('[API JSON PARSE FAILED]', {
      url,
      status: response.status,
      preview: rawText.slice(0, 300),
    });
    throw new SafeApiJsonParseError(url, response.status, rawText);
  }
}

function endpointTag(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

function buildRequestUrl(endpoint: string): string {
  const path = endpointTag(endpoint);
  if (path.startsWith('/api')) {
    throw new Error(
      `[BaigDentPro] Invalid path ${path}: omit /api prefix — requests use API_BASE (${API_BASE}) only.`
    );
  }
  return `${API_BASE}${path}`;
}

function mergeSignals(user: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!user) return timeout;
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([user, timeout]);
  }
  return user;
}

/** Timeout / navigation / user cancel — not actionable for global error capture. */
function isAbortLike(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const name = 'name' in err && typeof (err as { name: unknown }).name === 'string' ? (err as { name: string }).name : '';
  return name === 'AbortError';
}

export function rethrowSafeFetchFailure(err: unknown): never {
  if (
    err instanceof InvalidLoginHostError ||
    err instanceof LoginReturnedHtmlError ||
    err instanceof LoginExpectedJsonBodyError
  ) {
    throw err;
  }
  if (err instanceof TypeError) {
    throw err;
  }
  if (
    err instanceof Error &&
    (err.message === HTML_API_ERROR ||
      err.message === LOGIN_RETURNED_HTML_ERROR ||
      err.message === INVALID_LOGIN_HOST_ERROR ||
      err.message === 'Expected JSON but got non-JSON response')
  ) {
    if (err.message === LOGIN_RETURNED_HTML_ERROR) throw new LoginReturnedHtmlError();
    if (err.message === INVALID_LOGIN_HOST_ERROR) throw new InvalidLoginHostError();
    if (err.message === 'Expected JSON but got non-JSON response') throw new LoginExpectedJsonBodyError();
    throw err;
  }
  if (err instanceof SafeApiJsonParseError) {
    if (DEBUG_API) {
      console.warn('Non-JSON response preview:', err.rawText.slice(0, 200));
    }
    throw err;
  }
  const msg = userMessageFromUnknown(err);
  throw new ApiHttpError(msg, 0, '');
}

function serializeRequestBody(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export async function buildAuthHeaders(
  extra: Record<string, string> = {},
  options: { omitAuth?: boolean } = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-id': getCoreSessionId(),
    ...extra,
  };
  if (!options.omitAuth && !headers.Authorization) {
    const appToken = getAccessToken()?.trim();
    const bearer = appToken || (await getSupabaseAccessToken()) || '';
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }
  }
  return headers;
}

async function notifyRefreshPipelineFailed(): Promise<void> {
  const fn = logoutOnRefreshPipelineFailure;
  if (!fn) {
    clearCoreApiSession(true);
    return;
  }
  try {
    await Promise.resolve(fn());
  } catch {
    clearCoreApiSession(true);
  }
}

async function rotateRefreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return false;

  const run = (async (): Promise<boolean> => {
    try {
      const refreshUrl = buildRequestUrl('/auth/refresh');
      const { response, data } = await executeCanonicalJsonTransport<{ token?: string; refreshToken?: string }>(
        refreshUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': getCoreSessionId(),
          },
          body: JSON.stringify({ refreshToken: rt }),
        }
      );
      if (!response.ok || !data?.token) {
        return false;
      }
      setAccessToken(data.token);
      if (data.refreshToken?.trim()) {
        setRefreshToken(data.refreshToken);
      }
      return true;
    } catch {
      return false;
    }
  })();

  refreshInFlight = run;
  try {
    return await run;
  } finally {
    refreshInFlight = null;
  }
}

function shouldAutoRefreshOn401(path: string): boolean {
  if (path === '/auth/login' || path === '/auth/refresh') return false;
  if (path === '/auth/logout' || path === '/auth/logout-all') return false;
  return Boolean(getRefreshToken());
}

function isStaleSessionMessage(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('session is outdated') ||
    text.includes('session is out of date') ||
    text.includes('please sign in again')
  );
}

function applyStaleSessionClears(status: number, message: string, hadAccessToken: boolean): void {
  if (typeof window === 'undefined') return;
  const errorText = message.toLowerCase();
  try {
    if (
      status === 403 &&
      (isStaleSessionMessage(errorText) || (hadAccessToken && errorText.includes('session')))
    ) {
      clearCoreApiSession(true);
      return;
    }
    if (status === 401) {
      if (
        errorText.includes('invalid token') ||
        errorText.includes('no token provided') ||
        errorText.includes('user not found') ||
        errorText.includes('unauthorized') ||
        errorText.includes('token expired') ||
        errorText.includes('jwt expired') ||
        errorText.includes('refresh token')
      ) {
        if (errorText.includes('refresh token')) {
          clearCoreApiSession(true);
        } else {
          setAccessToken(null);
          try {
            removeCachedUserSnapshotKey();
            setRefreshToken(null);
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export async function coreApiRequest<T>(
  endpoint: string,
  options: CoreApiOptions = {},
  allowRefreshRetry = true
): Promise<T> {
  coreApiBootstrapStorage();

  const path = endpointTag(endpoint);
  const fullUrl = buildRequestUrl(endpoint);

  const { method = 'GET', body, headers: extraHeaders = {}, signal: userSignal } = options;
  const suppressErrorCapture = options.suppressErrorCapture === true;
  const omitAuth = options.omitAuth === true;

  if (DEBUG_API) {
    console.log('API Request:', fullUrl);
  }

  const timeoutController = new AbortController();
  const timeoutId =
    typeof window !== 'undefined' ? window.setTimeout(() => timeoutController.abort(), API_TIMEOUT_MS) : 0;
  const mergedSignal =
    typeof window !== 'undefined' ? mergeSignals(userSignal, timeoutController.signal) : userSignal;

  const hadAccessToken = Boolean(getAccessToken()?.trim());

  let pack: JsonTransportResult<T | { error?: string }>;

  try {
    pack = await executeCanonicalJsonTransport<T | { error?: string }>(fullUrl, {
      method,
      headers: await buildAuthHeaders(extraHeaders, { omitAuth }),
      body: serializeRequestBody(body),
      signal: mergedSignal,
    });
  } catch (e) {
    if (typeof window !== 'undefined') window.clearTimeout(timeoutId);
    if (!suppressErrorCapture && !isAbortLike(e)) {
      captureError(e, { apiEndpoint: fullUrl });
    }
    rethrowSafeFetchFailure(e);
  }
  if (typeof window !== 'undefined') window.clearTimeout(timeoutId);

  const { response, rawText, data } = pack;

  if (!response.ok) {
    const parsed = parseApiErrorBody(rawText);
    const message = parsed ?? `Request failed (${response.status})`;

    if (
      response.status === 403 &&
      allowRefreshRetry &&
      path === '/auth/me' &&
      isStaleSessionMessage(message) &&
      Boolean(getRefreshToken())
    ) {
      const rotated = await rotateRefreshTokens();
      if (rotated) {
        return coreApiRequest<T>(endpoint, options, false);
      }
      await notifyRefreshPipelineFailed();
      const refreshErr = new ApiHttpError(message, response.status, rawText, fullUrl);
      if (!suppressErrorCapture) {
        captureError(refreshErr, {
          apiEndpoint: fullUrl,
          statusCode: response.status,
        });
      }
      throw refreshErr;
    }

    if (
      response.status === 401 &&
      allowRefreshRetry &&
      shouldAutoRefreshOn401(path)
    ) {
      const rotated = await rotateRefreshTokens();
      if (rotated) {
        return coreApiRequest<T>(endpoint, options, false);
      }
      await notifyRefreshPipelineFailed();
      const refreshErr = new ApiHttpError(message, response.status, rawText, fullUrl);
      captureError(refreshErr, {
        apiEndpoint: fullUrl,
        statusCode: response.status,
      });
      throw refreshErr;
    }

    applyStaleSessionClears(response.status, message, hadAccessToken);

    const requestErr = new ApiHttpError(message, response.status, rawText, fullUrl);
    const shouldCapture = path !== '/branding/public';
    if (shouldCapture) {
      if (!suppressErrorCapture) {
        captureError(requestErr, {
          apiEndpoint: fullUrl,
          statusCode: response.status,
        });
      }
    }
    throw requestErr;
  }

  if (!rawText.trim()) {
    return null as T;
  }
  if (data === undefined) {
    if (DEBUG_API) {
      console.warn('Non-JSON response preview:', rawText.slice(0, 200));
    }
    const invalidJsonErr = new ApiHttpError(
      'The server returned an invalid JSON body. If this persists, check the API URL and response shape.',
      response.status,
      rawText,
      fullUrl
    );
    captureError(invalidJsonErr, { apiEndpoint: fullUrl, statusCode: response.status });
    throw invalidJsonErr;
  }

  return data as T;
}

export async function coreApiFormDataRequest<T>(
  endpoint: string,
  options: CoreApiFormDataOptions,
  allowRefreshRetry = true
): Promise<T> {
  coreApiBootstrapStorage();
  const path = endpointTag(endpoint);
  const fullUrl = buildRequestUrl(endpoint);
  const { method = 'POST', formData, headers: extraHeaders = {}, signal: userSignal } = options;
  const timeoutController = new AbortController();
  const timeoutId =
    typeof window !== 'undefined' ? window.setTimeout(() => timeoutController.abort(), API_TIMEOUT_MS) : 0;
  const mergedSignal =
    typeof window !== 'undefined' ? mergeSignals(userSignal, timeoutController.signal) : userSignal;
  const baseHeaders = await buildAuthHeaders(extraHeaders);
  delete baseHeaders['Content-Type'];
  let pack: JsonTransportResult<T | { error?: string }>;
  try {
    pack = await executeCanonicalJsonTransport<T | { error?: string }>(fullUrl, {
      method,
      headers: baseHeaders,
      body: formData,
      signal: mergedSignal,
    });
  } catch (e) {
    if (typeof window !== 'undefined') window.clearTimeout(timeoutId);
    if (!isAbortLike(e)) {
      captureError(e, { apiEndpoint: fullUrl });
    }
    rethrowSafeFetchFailure(e);
  }
  if (typeof window !== 'undefined') window.clearTimeout(timeoutId);
  const { response, rawText, data } = pack;
  if (!response.ok) {
    const parsed = parseApiErrorBody(rawText);
    const message = parsed ?? `Request failed (${response.status})`;
    if (response.status === 401 && allowRefreshRetry && shouldAutoRefreshOn401(path)) {
      const rotated = await rotateRefreshTokens();
      if (rotated) return coreApiFormDataRequest<T>(endpoint, options, false);
      await notifyRefreshPipelineFailed();
    }
    const requestErr = new ApiHttpError(message, response.status, rawText, fullUrl);
    captureError(requestErr, { apiEndpoint: fullUrl, statusCode: response.status });
    throw requestErr;
  }
  if (!rawText.trim()) return null as T;
  if (data === undefined) {
    throw new ApiHttpError('Upload response was not valid JSON', response.status, rawText, fullUrl);
  }
  return data as T;
}
