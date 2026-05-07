function resolveJwtSecret(): string {
  const trimmed = process.env.JWT_SECRET?.trim();
  if (trimmed) return trimmed;
  if (process.env.NODE_ENV === 'development') {
    return 'dev-secret-change-in-production-super-secure-dev-fallback-64chars-longer-is-better';
  }
  throw new Error('JWT_SECRET environment variable is required for production deployment (must be non-empty)');
}

export const JWT_SECRET = resolveJwtSecret();

/** Access JWT lifetime — keep ≤ 2h; refresh extends active sessions. Override via `JWT_EXPIRES_IN`. */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';

/** Refresh token lifetime in days (stored hashed in DB). */
export const JWT_REFRESH_EXPIRES_DAYS = Math.max(
  1,
  Math.min(365, parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30', 10) || 30)
);
