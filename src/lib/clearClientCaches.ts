/**
 * One-shot cleanup on load: remove any legacy service workers and Cache Storage
 * so old bundles cannot keep serving same-origin `/api` behavior after deploy.
 */
export async function clearClientCaches(): Promise<void> {
  if (typeof window === 'undefined') return;

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
}
