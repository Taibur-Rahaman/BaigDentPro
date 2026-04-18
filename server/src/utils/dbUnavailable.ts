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
    error:
      'Database is not reachable. Start PostgreSQL (from repo root: `docker compose up -d`), then run `npm run db:setup:doctor` (migrations + seed for practice panel) or `cd server && npx prisma db push && npm run db:seed`. Or set DATABASE_URL to your hosted Postgres.',
  });
}
