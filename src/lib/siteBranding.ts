import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { ApiHttpError } from '@/lib/apiErrors';

const SITE_LOGO_STORAGE_KEY = 'baigdentpro:master-site-logo';
const SITE_LOGO_VERSION_STORAGE_KEY = 'baigdentpro:master-site-logo-version';
const SITE_LOGO_EVENT = 'baigdentpro:site-logo-updated';
const DEFAULT_SITE_LOGO = '/logo.png?v=20260506-transparent-bg';

let inflight: Promise<string> | null = null;
let publicBrandingEndpointMissing = false;

function normalizeLogoUrl(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function getDefaultSiteLogoUrl(): string {
  return DEFAULT_SITE_LOGO;
}

export function getCachedSiteLogoUrl(): string {
  if (typeof window === 'undefined') return '';
  return normalizeLogoUrl(window.localStorage.getItem(SITE_LOGO_STORAGE_KEY));
}

export function setCachedSiteLogoUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLogoUrl(url);
  if (normalized) window.localStorage.setItem(SITE_LOGO_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(SITE_LOGO_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SITE_LOGO_EVENT, { detail: { url: normalized } }));
}

function getCachedVersion(): string {
  if (typeof window === 'undefined') return '';
  return normalizeLogoUrl(window.localStorage.getItem(SITE_LOGO_VERSION_STORAGE_KEY));
}

function setCachedVersion(version: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLogoUrl(version);
  if (normalized) window.localStorage.setItem(SITE_LOGO_VERSION_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(SITE_LOGO_VERSION_STORAGE_KEY);
}

export function siteLogoUpdateEventName(): string {
  return SITE_LOGO_EVENT;
}

export async function loadSiteLogoUrl(force = false): Promise<string> {
  const cached = getCachedSiteLogoUrl();
  if (!force && publicBrandingEndpointMissing) {
    return cached || '';
  }
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;
  inflight = coreApiRequest<{ masterLogoUrl?: unknown; version?: unknown }>(
    '/branding/public',
    { method: 'GET', omitAuth: true, suppressErrorCapture: true }
  )
    .then((payload) => {
      const nextVersion = normalizeLogoUrl(payload?.version);
      const versionChanged = Boolean(nextVersion) && nextVersion !== getCachedVersion();
      const nextUrl = normalizeLogoUrl(payload?.masterLogoUrl);
      if (versionChanged || force) {
        setCachedSiteLogoUrl(nextUrl);
      } else if (!cached) {
        setCachedSiteLogoUrl(nextUrl);
      }
      setCachedVersion(nextVersion);
      return nextUrl;
    })
    .catch((err: unknown) => {
      if (err instanceof ApiHttpError && err.status === 404) {
        // Some deployments may lag behind and miss `/api/branding/public`.
        // Fail soft and stop repeatedly calling the missing endpoint.
        publicBrandingEndpointMissing = true;
      }
      return '';
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
