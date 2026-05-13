import { ApiHttpError } from '@/lib/apiErrors';

export type ErrorReportPayload = {
  message: string;
  stack?: string;
  apiEndpoint?: string;
  statusCode?: number;
  code?: string;
  timestamp: string;
  page: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop';
};

type ErrorContextUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  clinicName?: string | null;
  clinicId?: string | null;
};

type ErrorContext = {
  user: ErrorContextUser;
};

type ErrorListener = (payload: ErrorReportPayload) => void;

/** Support WhatsApp (E.164 digits, no +) — local 01601677122 → `https://wa.me/8801601677122` */
export const SUPPORT_WHATSAPP_E164 = '8801601677122';
const listeners = new Set<ErrorListener>();
const state: { latest: ErrorReportPayload | null; context: ErrorContext } = {
  latest: null,
  context: { user: {} },
};

let globalAttached = false;
let fetchAttached = false;
/** macOS/VPN/Chromium sometimes emit brief `offline` blips; only surface after sustained loss. */
const OFFLINE_CONFIRM_MS = 1_400;

function nowIso(): string {
  return new Date().toISOString();
}

function currentPage(): string {
  if (typeof window === 'undefined') return '';
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function currentUserAgent(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.userAgent || 'unknown';
}

function currentDeviceType(): 'mobile' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  return /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function isHealthEndpoint(endpoint: string): boolean {
  const raw = endpoint.trim();
  if (!raw) return false;
  try {
    const base =
      typeof window !== 'undefined' ? new URL(window.location.href).origin : 'http://localhost';
    const pathname = new URL(raw, base).pathname;
    return pathname === '/api/health' || pathname.startsWith('/api/health/');
  } catch {
    return raw.endsWith('/api/health') || raw.includes('/api/health?');
  }
}

/** Fetches that are allowed to fail quietly when the API is offline (dev / spotty network). */
function isOptionalPublicBootstrapFetch(endpoint: string): boolean {
  if (isHealthEndpoint(endpoint)) return true;
  const e = endpoint.toLowerCase();
  if (e.includes('/branding/public')) return true;
  return false;
}

function maskSensitive(input: string): string {
  return input
    .replace(/(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]')
    .replace(/(token|password|secret|authorization|apikey|api_key|jwt|cookie)\s*[:=]\s*([^\s,;]+)/gi, '$1: [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]');
}

/** 401 on login/register/OTP flows means invalid credentials or OTP — not “session expired”. */
function isCredentialOrPortalAuth401(endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  const ep = endpoint.toLowerCase();
  return (
    ep.includes('/auth/login') ||
    ep.includes('/auth/register') ||
    ep.includes('/patient-portal/auth/verify-otp') ||
    ep.includes('/patient-portal/auth/request-otp')
  );
}

/** True when the UI should show the session-expired flow (no WhatsApp, no technical codes). */
export function isSessionExpiryPayload(payload: ErrorReportPayload): boolean {
  if (payload.statusCode === 401 && isCredentialOrPortalAuth401(payload.apiEndpoint)) return false;
  if (payload.statusCode === 401) return true;
  if (payload.statusCode === 403) {
    const m = (payload.message || '').toLowerCase();
    return (
      m.includes('session') &&
      (m.includes('outdated') || m.includes('expired') || m.includes('invalid token'))
    );
  }
  const m = (payload.message || '').toLowerCase();
  if (
    m.includes('token expired') ||
    m.includes('jwt expired') ||
    m.includes('session is outdated') ||
    m.includes('no token provided')
  ) {
    return true;
  }
  return false;
}

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Unexpected error';
}

function normalizeError(input: unknown, extras?: Partial<ErrorReportPayload>): ErrorReportPayload {
  const message = messageFromUnknown(input);
  const stack = input instanceof Error ? input.stack : undefined;
  const statusCode =
    typeof extras?.statusCode === 'number'
      ? extras.statusCode
      : input instanceof ApiHttpError
        ? input.status
        : undefined;
  const apiEndpoint =
    extras?.apiEndpoint ??
    (input instanceof ApiHttpError && typeof input.endpoint === 'string' ? input.endpoint : undefined);
  const code =
    extras?.code ??
    (input instanceof ApiHttpError
      ? input.status > 0
        ? `HTTP_${input.status}`
        : 'NETWORK_ERROR'
      : input instanceof Error && input.name
        ? input.name
        : undefined);
  return {
    message: maskSensitive(message),
    stack: stack ? maskSensitive(stack) : undefined,
    apiEndpoint: apiEndpoint ? maskSensitive(apiEndpoint) : undefined,
    statusCode,
    code,
    timestamp: extras?.timestamp ?? nowIso(),
    page: extras?.page ?? currentPage(),
    userAgent: extras?.userAgent ?? currentUserAgent(),
    deviceType: extras?.deviceType ?? currentDeviceType(),
  };
}

/** Guest storefront paths — HomePage tolerates offline API via demo catalog; do not spam global error UI. */
function isPublicShopGuestFetch(endpoint: string): boolean {
  const ep = endpoint.toLowerCase();
  if (!ep.includes('/shop/')) return false;
  if (ep.includes('/shop/admin/')) return false;
  return true;
}

function isLikelyConnectivityFailure(payload: ErrorReportPayload): boolean {
  const message = (payload.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed') ||
    payload.statusCode === 0
  );
}

/** Fetch timeout / user navigation / duplicate in-flight cancel — not useful for support reports. */
function isAbortReportPayload(payload: ErrorReportPayload): boolean {
  const code = (payload.code || '').toUpperCase();
  if (code === 'ABORTERROR') return true;
  const message = (payload.message || '').toLowerCase();
  return (
    message.includes('signal is aborted') ||
    message.includes('the user aborted a request') ||
    message.includes('aborterror')
  );
}

function shouldIgnoreReport(payload: ErrorReportPayload): boolean {
  if (isAbortReportPayload(payload)) return true;

  const endpoint = (payload.apiEndpoint || '').toLowerCase();
  const message = (payload.message || '').toLowerCase();

  if (endpoint.includes('/api/branding/public') || endpoint.includes('/branding/public')) {
    if (payload.statusCode === 401 || payload.statusCode === 404) return true;
    if (message.includes('no token provided') || message.includes('api route not found')) return true;
    if (isLikelyConnectivityFailure(payload)) return true;
  }

  if (isPublicShopGuestFetch(endpoint) && isLikelyConnectivityFailure(payload)) {
    return true;
  }

  return false;
}

/** If true, the global error modal should not open for this payload (stale or ignorable). */
export function isIgnorableErrorReport(payload: ErrorReportPayload | null | undefined): boolean {
  if (payload == null) return true;
  return shouldIgnoreReport(payload);
}

export function setErrorHandlerUserContext(user: ErrorContextUser): void {
  state.context.user = { ...user };
}

export function getLatestErrorPayload(): ErrorReportPayload | null {
  return state.latest;
}

export function subscribeToErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function captureError(input: unknown, extras?: Partial<ErrorReportPayload>): ErrorReportPayload {
  const payload = normalizeError(input, extras);
  if (shouldIgnoreReport(payload)) {
    return payload;
  }
  state.latest = payload;
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      /* ignore listener failures */
    }
  });
  return payload;
}

export function installGlobalErrorHandlers(): void {
  if (globalAttached || typeof window === 'undefined') return;
  globalAttached = true;
  let offlineConfirmTimer: ReturnType<typeof setTimeout> | null = null;

  const clearOfflineConfirm = (): void => {
    if (offlineConfirmTimer !== null) {
      clearTimeout(offlineConfirmTimer);
      offlineConfirmTimer = null;
    }
  };

  window.addEventListener('error', (event) => {
    captureError(event.error ?? event.message, { code: 'RUNTIME_ERROR' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, { code: 'ASYNC_ERROR' });
  });
  window.addEventListener('online', clearOfflineConfirm);
  window.addEventListener('offline', () => {
    clearOfflineConfirm();
    offlineConfirmTimer = setTimeout(() => {
      offlineConfirmTimer = null;
      if (typeof navigator !== 'undefined' && navigator.onLine) return;
      captureError('Network offline', { code: 'OFFLINE', statusCode: 0 });
    }, OFFLINE_CONFIRM_MS);
  });
}

export function installFetchErrorInterceptor(): void {
  if (fetchAttached || typeof window === 'undefined') return;
  fetchAttached = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    try {
      return await originalFetch(...args);
    } catch (error) {
      const firstArg = args[0];
      const endpoint = typeof firstArg === 'string' ? firstArg : firstArg instanceof Request ? firstArg.url : '';
      if (
        error != null &&
        typeof error === 'object' &&
        'name' in error &&
        (error as { name: string }).name === 'AbortError'
      ) {
        throw error;
      }
      if (isOptionalPublicBootstrapFetch(endpoint)) {
        throw error;
      }
      captureError(error, {
        apiEndpoint: endpoint || undefined,
        code: 'FETCH_ERROR',
      });
      throw error;
    }
  };
}

export function buildWhatsAppReportMessage(payload: ErrorReportPayload): string {
  const user = state.context.user;
  const displayName = user.name?.trim() || '—';
  const clinicName = user.clinicName?.trim() || '—';
  const route = payload.page || currentPage();
  const stack =
    payload.stack && payload.stack.trim()
      ? maskSensitive(payload.stack.split('\n').slice(0, 12).join('\n'))
      : '—';
  const lines = [
    'BaigDentPro — error report',
    '',
    `User: ${displayName}`,
    `Clinic: ${clinicName}`,
    `Route: ${route}`,
    '',
    `Error: ${maskSensitive(payload.message)}`,
    `Time: ${payload.timestamp}`,
    '',
    'Stack (sanitized):',
    stack,
    '',
    `Device: ${payload.deviceType}; UA: ${maskSensitive(payload.userAgent)}`,
  ];
  return lines.join('\n');
}

export function openWhatsAppErrorReport(payload: ErrorReportPayload): void {
  if (typeof window === 'undefined') return;
  if (isSessionExpiryPayload(payload)) return;
  const message = buildWhatsAppReportMessage(payload);
  const url = `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
