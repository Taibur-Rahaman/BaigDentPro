const CACHE_CLEAR_KEY = 'baigdentpro:cache-cleared-for';

function currentBuildId(): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector('meta[name="baigdent-build-id"]')?.getAttribute('content')?.trim() ?? '';
}

/**
 * One-shot cleanup per deploy build: unregister legacy service workers and clear Cache Storage
 * so old bundles cannot keep serving stale same-origin assets. Skips repeat work on every navigation.
 */
export async function clearClientCaches(): Promise<void> {
  if (typeof window === 'undefined') return;

  const buildId = currentBuildId() || 'unknown';
  try {
    const last = sessionStorage.getItem(CACHE_CLEAR_KEY);
    if (last === buildId) return;
  } catch {
    /* continue — attempt cleanup */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }

  try {
    if ('caches' in window && typeof caches.keys === 'function') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(CACHE_CLEAR_KEY, buildId);
  } catch {
    /* ignore */
  }
}
