export const JWT_SECRET = process.env.JWT_SECRET ?? (
  process.env.NODE_ENV === 'development' 
    ? 'dev-secret-change-in-production-super-secure-dev-fallback-64chars-longer-is-better' 
    : (() => { throw new Error('JWT_SECRET environment variable is required for production deployment'); })()
);

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

/** Refresh token lifetime in days (stored hashed in DB). */
export const JWT_REFRESH_EXPIRES_DAYS = Math.max(
  1,
  Math.min(365, parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30', 10) || 30)
);
