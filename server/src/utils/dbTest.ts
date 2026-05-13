import { prismaBase } from '../db/prisma.js';

/** Maps Prisma/driver messages to a coarse failure bucket for health checks. */
export function detectErrorType(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (lower.includes('tenant/user') || lower.includes('no tenant identifier')) return 'CONFIG_ERROR';
  if (lower.includes('database') && lower.includes('does not exist')) return 'CONFIG_ERROR';
  if (lower.includes('enotfound')) return 'DNS_ERROR';
  if (lower.includes('authentication') || lower.includes('password authentication')) return 'AUTH_ERROR';
  if (
    lower.includes('timeout') ||
    lower.includes('etimedout') ||
    lower.includes("can't reach database server") ||
    lower.includes('p1001') ||
    lower.includes('econnrefused')
  ) {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN';
}

export function hintForDbFailure(errorType: string): string {
  switch (errorType) {
    case 'CONFIG_ERROR':
      return 'Supabase pooler username must be postgres.<project-ref> and match the pooler host, or use the exact URI from Dashboard → Database. Fix placeholders in DATABASE_URL.';
    case 'DNS_ERROR':
      return 'Check hostname (copy URI host from Supabase → Settings → Database). Pooler uses *.pooler.supabase.com; direct uses db.<project-ref>.supabase.co.';
    case 'AUTH_ERROR':
      return 'Verify database password in Supabase; URL-encode special characters in DATABASE_URL (@ : / ? #).';
    case 'NETWORK_ERROR':
      return 'Check outbound firewall, Supabase project status, and that the port (5432/6543) matches the connection mode you chose.';
    case 'UNKNOWN':
    default:
      return 'Compare DATABASE_URL to Supabase Dashboard → Database → Connection string; ensure user matches pooler (e.g. postgres.<ref> for pooler).';
  }
}

export type TestDbResult =
  | { ok: true }
  | { ok: false; error: string; type: string };

/**
 * Single query to verify DB connectivity; does not log secrets.
 */
export async function testDB(): Promise<TestDbResult> {
  try {
    await prismaBase.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error,
      type: detectErrorType(e),
    };
  }
}
