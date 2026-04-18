import { API_TIMEOUT_MS, getApiBaseUrl, HTML_API_ERROR } from '@/config/api';
import { ApiHttpError, parseApiErrorBody, userMessageFromUnknown } from '@/lib/apiErrors';
import { getSupabaseAccessToken } from '@/lib/supabaseClient';

const APP_TOKEN_KEY = 'baigdentpro:token';

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

let refreshInFlight: Promise<boolean> | null = null;

function clearStoredSession(): void {
  try {
    localStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem('baigdentpro:user');
    localStorage.removeItem('baigdentpro:refreshToken');
    window.dispatchEvent(new CustomEvent('baigdentpro:auth-expired'));
  } catch {
    /* ignore */
  }
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = typeof window !== 'undefined' ? window.localStorage.getItem('baigdentpro:refreshToken')?.trim() : '';
  if (!rt) return false;

  const run = (async (): Promise<boolean> => {
    try {
      assertNoSameOriginFallbackInProductionMode();
      const refreshUrl = buildRequestUrl('/api/auth/refresh');
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const text = await res.text();
      if (!res.ok) return false;
      const j = JSON.parse(text) as { token?: string; refreshToken?: string };
      if (j.token) localStorage.setItem(APP_TOKEN_KEY, j.token);
      if (j.refreshToken) localStorage.setItem('baigdentpro:refreshToken', j.refreshToken);
      return Boolean(j.token);
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

async function authHeader(): Promise<Record<string, string>> {
  try {
    const appToken = localStorage.getItem(APP_TOKEN_KEY)?.trim();
    if (appToken) {
      return { Authorization: `Bearer ${appToken}` };
    }
    const sbToken = await getSupabaseAccessToken();
    return sbToken ? { Authorization: `Bearer ${sbToken}` } : {};
  } catch {
    return {};
  }
}

function mergeSignals(user: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!user) return timeout;
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([user, timeout]);
  }
  return user;
}

function buildRequestUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${path}` : path;
}

function assertNoSameOriginFallbackInProductionMode(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE !== 'production') return;
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      '[BaigDentPro] API origin is empty in a production-mode bundle. Set VITE_API_URL at build time.'
    );
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}, allowRefreshRetry = true) {
  assertNoSameOriginFallbackInProductionMode();
  const fullUrl = buildRequestUrl(endpoint);

  if (DEBUG_API) {
    let baseLabel: string;
    try {
      baseLabel = getApiBaseUrl() || '(same-origin /api)';
    } catch (e) {
      baseLabel = e instanceof Error ? e.message : String(e);
    }
    console.log('API BASE:', baseLabel);
    console.log('API Request:', fullUrl);
  }

  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), API_TIMEOUT_MS);
  const signal = mergeSignals(options.signal ?? undefined, timeoutController.signal);

  const bearerHeaders = await authHeader();

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...bearerHeaders,
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    let msg = userMessageFromUnknown(e);
    const splitHost = Boolean(getApiBaseUrl());
    const looksNetwork =
      e instanceof TypeError ||
      (e instanceof Error && /Failed to fetch|Load failed|NetworkError/i.test(e.message));
    if (splitHost && looksNetwork) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      msg += ` Split-host hint: confirm VITE_API_URL at build time is the API origin (e.g. https://api.baigdentpro.com), not the static site. If curl works but the browser fails, check CORS allows ${origin || 'this origin'}.`;
    }
    throw new ApiHttpError(msg, 0, '');
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await res.text();

  const isHtml =
    (res.headers.get('content-type') || '').toLowerCase().includes('text/html') || /^\s*</.test(text);

  if (isHtml) {
    console.error('❌ HTML RESPONSE DETECTED:', {
      url: fullUrl,
      preview: text.slice(0, 200),
    });
    throw new ApiHttpError(HTML_API_ERROR, res.status, text);
  }

  if (!res.ok) {
    const parsed = parseApiErrorBody(text);
    const fallback = `Request failed (${res.status})`;
    const message = parsed ?? fallback;
    const errorText = String(message).toLowerCase();

    if (
      res.status === 401 &&
      allowRefreshRetry &&
      !endpoint.includes('/auth/refresh') &&
      localStorage.getItem(APP_TOKEN_KEY)?.trim() &&
      (errorText.includes('token expired') || errorText.includes('jwt expired'))
    ) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) {
        return apiRequest(endpoint, options, false);
      }
      clearStoredSession();
    }

    if (res.status === 401 || res.status === 403) {
      try {
        const token = localStorage.getItem(APP_TOKEN_KEY)?.trim();
        if (token) {
          const staleSession =
            res.status === 403 &&
            (errorText.includes('session is outdated') ||
              errorText.includes('session is out of date') ||
              errorText.includes('please sign in again'));
          if (staleSession) {
            clearStoredSession();
          } else if (
            res.status === 401 &&
            (errorText.includes('invalid token') ||
              errorText.includes('no token provided') ||
              errorText.includes('user not found') ||
              errorText.includes('unauthorized') ||
              errorText.includes('token expired') ||
              errorText.includes('refresh token'))
          ) {
            clearStoredSession();
          }
        }
      } catch {
        /* ignore storage */
      }
    }
    throw new ApiHttpError(message, res.status, text);
  }

  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (DEBUG_API) {
      console.warn('Non-JSON response preview:', text.slice(0, 200));
    }
    throw new ApiHttpError(
      'The server returned an invalid JSON body. If this persists, check the API URL and response shape.',
      res.status,
      text
    );
  }
}
