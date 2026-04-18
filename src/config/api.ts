/**
 * Public API origin for absolute `fetch` URLs (no trailing slash).
 * Paths must start with `/api/...` (e.g. `/api/products`).
 *
 * - **Vite dev** (`import.meta.env.DEV`): empty `VITE_API_URL` → same-origin `/api` (proxy).
 * - **Built bundle, `MODE === 'production'`** (default `vite build`): `VITE_API_URL` is **required**
 *   and must be `http://` or `https://`; no silent same-origin fallback.
 * - **Other build modes** (e.g. `alpha`): empty URL allowed for same-origin `/api` behind Express.
 */

export const API_TIMEOUT_MS = 10_000;

const HTML_API_ERROR =
  'API returned HTML instead of JSON. Likely wrong VITE_API_URL or frontend routing issue.';

export { HTML_API_ERROR };

function isStrictProductionMode(): boolean {
  return import.meta.env.MODE === 'production';
}

/**
 * @throws Error when MODE is `production` and VITE_API_URL is missing or not http(s)
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim();

  if (!raw) {
    if (isStrictProductionMode()) {
      throw new Error(
        '[BaigDentPro] VITE_API_URL is missing. Production bundles must set it at build time ' +
          '(e.g. https://api.baigdentpro.com) so API calls do not hit the static site as /api.'
      );
    }
    return '';
  }

  if (!/^https?:\/\//i.test(raw)) {
    if (isStrictProductionMode()) {
      throw new Error(
        `[BaigDentPro] VITE_API_URL must start with http:// or https://. Got: ${raw}`
      );
    }
    console.warn('Invalid VITE_API_URL (ignored for same-origin /api):', raw);
    return '';
  }

  try {
    return new URL(raw).origin;
  } catch {
    if (isStrictProductionMode()) {
      throw new Error(`[BaigDentPro] VITE_API_URL could not be parsed as a URL: ${raw}`);
    }
    console.warn('Failed to parse VITE_API_URL:', raw);
    return '';
  }
}

/** Shown on diagnostics screens (no secrets). */
export function getApiBaseUrlLabel(): string {
  try {
    const base = getApiBaseUrl();
    if (base) return base;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid API configuration';
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin} (relative /api)`;
  }
  if (import.meta.env.DEV) return '(relative /api)';
  return '(same-origin /api)';
}
