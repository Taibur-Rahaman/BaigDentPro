/**
 * Startup checks for database and secrets (common deployment threats).
 */

const PLACEHOLDER_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'changeme',
  'secret',
]);

export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const frontend = (process.env.FRONTEND_URL ?? '').trim();
  if (!frontend) {
    throw new Error(
      'FRONTEND_URL is required in production (comma-separated origins), e.g. https://yourdomain.com'
    );
  }

  const jwt = (process.env.JWT_SECRET ?? '').trim();
  if (!jwt) {
    throw new Error('JWT_SECRET is required in production');
  }
  if (jwt.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  if (PLACEHOLDER_SECRETS.has(jwt.toLowerCase())) {
    throw new Error('JWT_SECRET must be replaced with a strong random value in production');
  }

  const db = process.env.DATABASE_URL ?? '';
  if (!db) {
    throw new Error('DATABASE_URL is required in production');
  }

  const lower = db.toLowerCase();
  if (lower.includes('file:') || lower.includes('sqlite')) {
    throw new Error('SQLite/file databases must not be used in production. Use PostgreSQL.');
  }
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('@db:5432')
  ) {
    throw new Error(
      'DATABASE_URL points to local/private host in production. Use your managed Supabase PostgreSQL connection string.'
    );
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
}
