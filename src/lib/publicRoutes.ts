/** Credential forms only — skip blocking auth bootstrap while typing. */
export function isPublicCredentialRoute(pathname: string): boolean {
  return /^\/(login|signup)(\/|$)/.test(pathname);
}

/** Marketing / portal entry — avoid auth.me and navigation revalidation on first paint. */
export function isPublicMarketingRoute(pathname: string): boolean {
  return pathname === '/' || /^\/staff-portal(\/|$)/.test(pathname);
}

export function isPublicUnauthenticatedRoute(pathname: string): boolean {
  return isPublicCredentialRoute(pathname) || isPublicMarketingRoute(pathname);
}
