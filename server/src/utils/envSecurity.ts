/**
 * Startup checks for database and secrets (common deployment threats).
 */

export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const db = process.env.DATABASE_URL ?? '';
  if (!db) {
    throw new Error('DATABASE_URL is required in production');
  }

  const lower = db.toLowerCase();
  if (lower.includes('file:') || lower.includes('sqlite')) {
    throw new Error('SQLite/file databases must not be used in production. Use PostgreSQL.');
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
