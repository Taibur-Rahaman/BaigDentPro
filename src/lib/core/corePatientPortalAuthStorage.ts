const ACCESS = 'baigdentpro:patientPortal:accessToken';
const REFRESH = 'baigdentpro:patientPortal:refreshToken';

export function getPatientPortalAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(ACCESS);
  } catch {
    return null;
  }
}

export function setPatientPortalAccessToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(ACCESS, token);
    else sessionStorage.removeItem(ACCESS);
  } catch {
    /* ignore */
  }
}

export function getPatientPortalRefreshToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(REFRESH);
  } catch {
    return null;
  }
}

export function setPatientPortalRefreshToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(REFRESH, token);
    else sessionStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
}

export function clearPatientPortalSession(): void {
  setPatientPortalAccessToken(null);
  setPatientPortalRefreshToken(null);
}
