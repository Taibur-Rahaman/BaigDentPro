/** Auth/session localStorage keys + migration — never calls fetch. */

export const ACCESS_TOKEN_KEY = 'baigdentpro:accessToken' as const;
const LEGACY_ACCESS_TOKEN_KEY = 'baigdentpro:token';
const REFRESH_TOKEN_KEY = 'baigdentpro:refreshToken';
const USER_STORAGE_KEY = 'baigdentpro:user';
const SESSION_ID_STORAGE_KEY = 'baigdentpro:sessionId';

/** Session id attached as `x-session-id`; generated once per browser profile when missing. */
export function getCoreSessionId(): string {
  if (typeof window === 'undefined') return 'sess_unknown';
  try {
    let s = window.localStorage.getItem(SESSION_ID_STORAGE_KEY)?.trim();
    if (!s) {
      s = `sess_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
      window.localStorage.setItem(SESSION_ID_STORAGE_KEY, s);
    }
    return s;
  } catch {
    return `sess_${Date.now().toString(36)}`;
  }
}

/** For HTTP layer clears (401 edge cases): remove snapshot without full teardown. */
export function removeCachedUserSnapshotKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Called on app bootstrap; migrates legacy access token key and ensures session id. */
export function coreApiBootstrapStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
    const legacy = window.localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)?.trim();
    if (!current && legacy) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, legacy);
      window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    }
    void getCoreSessionId();
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let t = window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
    if (!t) {
      const leg = window.localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)?.trim();
      if (leg) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, leg);
        window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
        t = leg;
      }
    }
    return t || null;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      const v = token.trim();
      window.localStorage.setItem(ACCESS_TOKEN_KEY, v);
      window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function setRefreshToken(raw: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const v = raw?.trim();
    if (v) window.localStorage.setItem(REFRESH_TOKEN_KEY, v);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function persistAuthTokensFromResponse(payload: { token?: string; refreshToken?: string }): void {
  if (payload.token?.trim()) {
    setAccessToken(payload.token);
  }
  if (payload.refreshToken?.trim()) {
    setRefreshToken(payload.refreshToken);
  }
}

export function coreApiGetUserSnapshotJson(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function coreApiSetUserSnapshotJson(serialized: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_STORAGE_KEY, serialized);
  } catch {
    /* ignore */
  }
}

export function coreApiRemoveUserSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearCoreApiSession(dispatchAuthExpired?: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (dispatchAuthExpired) {
      window.dispatchEvent(new CustomEvent('baigdentpro:auth-expired'));
    }
  } catch {
    /* ignore */
  }
}
