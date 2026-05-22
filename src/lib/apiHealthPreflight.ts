import { API_BASE } from '@/config/api';

export type ApiHealthSnapshot = {
  ok: boolean;
  database: 'ok' | 'error' | 'unknown' | string;
  status?: string;
};

const HEALTH_TIMEOUT_MS = 4_000;

/** Quick probe before login — avoids hanging the tab when API DB is down. */
export async function fetchApiHealthSnapshot(signal?: AbortSignal): Promise<ApiHealthSnapshot> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const merged =
    signal && typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: merged,
    });
    if (!res.ok) {
      return { ok: false, database: 'error', status: `http_${res.status}` };
    }
    const data = (await res.json()) as { database?: string; status?: string };
    const database = typeof data.database === 'string' ? data.database : 'unknown';
    return {
      ok: database === 'ok',
      database,
      status: typeof data.status === 'string' ? data.status : undefined,
    };
  } catch {
    return { ok: false, database: 'error', status: 'unreachable' };
  } finally {
    window.clearTimeout(timer);
  }
}

export function loginBlockedMessage(snapshot: ApiHealthSnapshot): string | null {
  if (snapshot.ok) return null;
  if (snapshot.database === 'error' || snapshot.status === 'degraded') {
    return 'The server database is temporarily unavailable. Wait a minute and try again, or contact support if this continues.';
  }
  return 'Unable to reach the API server. Check your connection and try again.';
}
