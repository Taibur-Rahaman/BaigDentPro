/** SPA origin for redirects (Supabase recovery links, post-login navigation). */
export function getSpaOrigin(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}
