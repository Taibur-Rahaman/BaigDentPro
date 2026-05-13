console.log('[startup] NODE_ENV =', process.env.NODE_ENV);
console.log('[startup] DATABASE_URL exists =', !!process.env.DATABASE_URL);
console.log('[startup] JWT_SECRET exists =', !!process.env.JWT_SECRET);
console.log('[startup] FRONTEND_URL =', process.env.FRONTEND_URL);

/**
 * Non-fatal env lookup — server keeps booting; callers must handle undefined.
 */
export function requireEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v) {
    console.warn('[ENV WARNING]', name, 'missing (non-fatal)');
    return undefined;
  }
  return v.trim();
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

/** Resolved critical env for logging (optional fields may be undefined). */
export const ENV = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET:
    nodeEnv === 'production' ? requireEnv('JWT_SECRET') ?? undefined : process.env.JWT_SECRET?.trim(),
  NODE_ENV: nodeEnv,
} as const;

if (nodeEnv === 'production') {
  requireEnv('FRONTEND_URL');
}
