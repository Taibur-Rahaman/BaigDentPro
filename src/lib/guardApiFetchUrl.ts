import { API_BASE, getApiHost } from '@/config/api';

/**
 * Blocks SPA-origin / cached bundles from ever calling www/apex `/api/*` (returns HTML → JSON.parse crash).
 */
export function guardApiFetchUrl(url: string): void {
  const u = String(url);
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    throw new Error('INVALID API TARGET DETECTED');
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'www.baigdentpro.com' || host === 'baigdentpro.com') {
    throw new Error('INVALID API TARGET DETECTED');
  }
  const allowedHost = getApiHost();
  if (!allowedHost || host !== allowedHost) {
    throw new Error('INVALID API TARGET DETECTED');
  }
  const pathname = parsed.pathname;
  const underApi = pathname === '/api' || pathname.startsWith('/api/');
  if (!underApi) {
    throw new Error('INVALID API TARGET DETECTED');
  }
  if (!(u.startsWith(`${API_BASE}/`) || u === API_BASE || u.startsWith(`${API_BASE}?`))) {
    throw new Error('INVALID API TARGET DETECTED');
  }
}
