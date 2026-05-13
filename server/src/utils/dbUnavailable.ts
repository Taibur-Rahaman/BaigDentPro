import type { Response } from 'express';

/** Prisma / driver errors when Postgres is not reachable. */
export function isDatabaseUnreachableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('P1001') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Authentication failed against database server') ||
    msg.includes('password authentication failed') ||
    msg.includes('tenant/user') ||
    msg.includes('no tenant identifier provided')
  );
}

export function sendDatabaseUnavailable(res: Response): void {
  res.status(503).json({
    error: 'Database not connected',
  });
}
