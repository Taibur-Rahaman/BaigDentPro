/**
 * Startup checks for database and secrets (common deployment threats).
 */

const PLACEHOLDER_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'changeme',
  'secret',
]);

/**
 * Reject localhost / invalid URLs; warn if TLS is not requested in the URL.
 * Set ALLOW_LOCALHOST_DB=1 only for local Docker Postgres (never in production).
 */
export function validateDatabaseUrlStrict(): void {
  const db = (process.env.DATABASE_URL ?? '').trim();
  if (!db) {
    return;
  }

  try {
    void new URL(db);
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid URL. Use postgresql://user:password@host:port/db?sslmode=require (see server/.env.example).'
    );
  }

  const lower = db.toLowerCase();
  if (
    lower.includes('your_project_ref') ||
    lower.includes('your-password') ||
    lower.includes('[password]') ||
    lower.includes('<password>') ||
    lower.includes('<project') ||
    lower.includes('your_password')
  ) {
    throw new Error(
      'DATABASE_URL still contains a placeholder. Paste the full URI from Supabase → Project Settings → Database (replace YOUR_PROJECT_REF and use the real password).'
    );
  }

  const isLikelySupabase =
    lower.includes('supabase.co') || lower.includes('pooler.supabase.com');
  const hasTls =
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify-full') ||
    lower.includes('sslmode=no-verify') ||
    lower.includes('ssl=true');
  if (isLikelySupabase && !hasTls) {
    throw new Error(
      'DATABASE_URL must include TLS for Supabase. Append ?sslmode=require (or add it to existing query params).'
    );
  }

  const allowLocal =
    process.env.ALLOW_LOCALHOST_DB === '1' || process.env.ALLOW_LOCALHOST_DB === 'true';
  if (
    (lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('0.0.0.0') ||
      lower.includes('@db:5432')) &&
    !allowLocal
  ) {
    throw new Error(
      'DATABASE_URL must not use localhost or container-internal DB hosts. Use your Supabase connection string. For local Docker Postgres only, set ALLOW_LOCALHOST_DB=1.'
    );
  }

  if (!hasTls && !isLikelySupabase) {
    console.warn(
      '[env] DATABASE_URL should include TLS for remote Postgres, e.g. ?sslmode=require (or sslmode=verify-full).'
    );
  }
}

export function validateRequiredEnvironment(): void {
  const db = (process.env.DATABASE_URL ?? '').trim();
  if (!db) {
    console.warn('[env] DATABASE_URL is not set — database features unavailable until configured.');
    return;
  }
  try {
    validateDatabaseUrlStrict();
  } catch (e) {
    console.warn('[env] DATABASE_URL validation:', e instanceof Error ? e.message : e);
  }
}

export function validateProductionEnvironment(): void {
  validateRequiredEnvironment();

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const warnProd = (msg: string) => console.warn('[production-env]', msg);

  const frontend = (process.env.FRONTEND_URL ?? '').trim();
  if (!frontend) {
    warnProd(
      'FRONTEND_URL is empty — CORS and cookie flows need it. Set in hPanel (e.g. https://baigdentpro.com,https://www.baigdentpro.com).'
    );
  }

  const jwt = (process.env.JWT_SECRET ?? '').trim();
  if (!jwt) {
    warnProd('JWT_SECRET is empty — /api/auth will not work until set in hPanel.');
  } else if (jwt.length < 32) {
    warnProd('JWT_SECRET should be at least 32 characters in production.');
  } else if (PLACEHOLDER_SECRETS.has(jwt.toLowerCase())) {
    warnProd('JWT_SECRET appears to be a placeholder — replace with a strong random value.');
  }

  const db = process.env.DATABASE_URL ?? '';
  if (!db.trim()) {
    warnProd('DATABASE_URL is empty in production — database routes will fail until set.');
    return;
  }

  try {
    new URL(db);
  } catch {
    warnProd(
      'DATABASE_URL is not a valid URL. Expected postgresql://user:pass@host:port/db?sslmode=require'
    );
    return;
  }

  const lower = db.toLowerCase();
  if (lower.includes('file:') || lower.includes('sqlite')) {
    warnProd('SQLite/file databases must not be used in production. Use PostgreSQL.');
    return;
  }
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('@db:5432')
  ) {
    warnProd(
      'DATABASE_URL points to local/private host in production — use your managed PostgreSQL connection string.'
    );
    return;
  }

  if (!lower.startsWith('postgresql://') && !lower.startsWith('postgres://')) {
    console.warn('[security] DATABASE_URL should use postgresql:// or postgres:// in production');
  }

  const hasTls =
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify-full') ||
    lower.includes('sslmode=no-verify') ||
    lower.includes('ssl=true');
  if (!hasTls) {
    console.warn(
      '[security] DATABASE_URL should enable TLS for managed Postgres (e.g. ?sslmode=require). See .env.example.'
    );
  }

  const direct = (process.env.DIRECT_URL ?? '').trim();
  if (lower.includes('pooler.supabase.com') && lower.includes(':6543')) {
    if (!direct) {
      warnProd(
        'DIRECT_URL is unset while DATABASE_URL uses Supabase pool :6543 — add session pool URI (port 5432) for migrations; runtime often works without it.'
      );
    } else {
      try {
        void new URL(direct);
      } catch {
        warnProd('DIRECT_URL is not a valid URL — fix in hPanel.');
      }
    }
  }

  try {
    validateSupabasePoolUrlsProduction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnProd(`Supabase URL checks: ${msg}`);
  }
}

/**
 * Hardening: in production, enforce Supabase pooler shape (IPv4-friendly app + session path for Migrate).
 * Rejects malformed hosts and missing TLS on both URLs.
 */
function validateSupabasePoolUrlsProduction(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const db = (process.env.DATABASE_URL ?? '').trim();
  const direct = (process.env.DIRECT_URL ?? '').trim();
  if (!db || !direct) {
    return;
  }

  const allowLocal =
    process.env.ALLOW_LOCALHOST_DB === '1' || process.env.ALLOW_LOCALHOST_DB === 'true';
  if (allowLocal) {
    return;
  }

  const requireTls = (u: string, name: string) => {
    const l = u.toLowerCase();
    if (
      !l.includes('sslmode=require') &&
      !l.includes('sslmode=verify-full') &&
      !l.includes('sslmode=no-verify') &&
      !l.includes('ssl=true')
    ) {
      throw new Error(`${name} must include TLS (e.g. ?sslmode=require) for production Supabase.`);
    }
  };

  try {
    const dbUrl = new URL(db);
    const directUrl = new URL(direct);

    const poolHostOk = dbUrl.hostname.endsWith('pooler.supabase.com');
    const directPoolOk = directUrl.hostname.endsWith('pooler.supabase.com');

    if (!poolHostOk || dbUrl.port !== '6543') {
      throw new Error(
        'Production DATABASE_URL must use the Supabase transaction pool: host *.pooler.supabase.com and port 6543.'
      );
    }
    if (!directPoolOk || directUrl.port !== '5432') {
      throw new Error(
        'Production DIRECT_URL must use the Supabase session pooler: host *.pooler.supabase.com and port 5432.'
      );
    }

    const localhost =
      /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(dbUrl.hostname) ||
      /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(directUrl.hostname);
    if (localhost) {
      throw new Error('Production database URLs must not use localhost. Use Supabase pooler hosts from the dashboard.');
    }

    const refLike = /^postgres\./.test(dbUrl.username) && /^postgres\./.test(directUrl.username);
    if (!refLike) {
      throw new Error(
        'Supabase pooler usernames should be postgres.<project-ref> (from Dashboard → Connect) for both DATABASE_URL and DIRECT_URL.'
      );
    }

    requireTls(db, 'DATABASE_URL');
    requireTls(direct, 'DIRECT_URL');
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error('Invalid DATABASE_URL or DIRECT_URL for production Supabase pool configuration.');
  }
}
