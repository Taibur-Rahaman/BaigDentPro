/**
 * Supabase bearer fallback after JWT verification fails (`authenticate` middleware).
 * Production: disabled unless `SUPABASE_BEARER_AUTH_ENABLED=true`.
 */
export function isSupabaseBearerAuthAllowed(): boolean {
  const v = process.env.SUPABASE_BEARER_AUTH_ENABLED?.trim().toLowerCase();
  if (process.env.NODE_ENV === 'production') {
    return v === 'true';
  }
  return v !== 'false';
}
