/** Wall-clock inactivity before automatic SaaS/staff session end (no pointer/keyboard/wheel). */
export const IDLE_SESSION_WALL_MS = 60 * 60 * 1000;

const STORAGE_KEY = 'baigdentpro:idleSignout';

/** Fresh marker TTL so stale keys never show the modal after a normal logout/restart. */
const MARKER_TTL_MS = 60_000;

export function setIdleLogoutMarker(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Returns true once if a recent idle sign-out marker was stored; clears the marker. */
export function consumeIdleLogoutMarker(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { at?: unknown };
    if (typeof data.at !== 'number' || !Number.isFinite(data.at)) return false;
    return Date.now() - data.at <= MARKER_TTL_MS;
  } catch {
    return false;
  }
}
