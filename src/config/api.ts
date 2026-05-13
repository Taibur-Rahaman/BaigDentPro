function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveApiBase(): string {
  const fromBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!fromBase) {
    throw new Error('[BaigDentPro] Missing VITE_API_BASE_URL. Set it explicitly for each environment.');
  }
  const resolved = trimTrailingSlash(fromBase);
  if (!/^https?:\/\//i.test(resolved) || !resolved.endsWith('/api')) {
    throw new Error(
      `[BaigDentPro] Invalid VITE_API_BASE_URL "${resolved}". Expected full origin with /api suffix.`
    );
  }
  if (import.meta.env.PROD && !resolved.startsWith('https://')) {
    throw new Error(`[BaigDentPro] Production API URL must use https, got "${resolved}"`);
  }
  return resolved;
}

/** Absolute API prefix for all browser traffic (`/api` included). */
export const API_BASE = resolveApiBase();

/** Canonical Prisma JWT login endpoint. */
export const AUTH_LOGIN_URL = `${API_BASE}/auth/login`;

export const API_TIMEOUT_MS = 10_000;

const HTML_API_ERROR =
  'API returned HTML instead of JSON. Likely wrong API URL or frontend routing issue.';

/** Login response body starts with `<` (usually SPA `<!DOCTYPE html>` — wrong URL or nginx fallback). */
export const LOGIN_RETURNED_HTML_ERROR = 'LOGIN RETURNED HTML' as const;

/** Wrong host passed into login fetch — must never be SPA / www. */
export const INVALID_LOGIN_HOST_ERROR = '[INVALID LOGIN HOST]' as const;

export { HTML_API_ERROR };

export function getApiHost(): string {
  try {
    return new URL(API_BASE).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Diagnostics UI only — same logical host as {@link API_BASE}. */
export function getApiBaseUrlLabel(): string {
  return API_BASE;
}
