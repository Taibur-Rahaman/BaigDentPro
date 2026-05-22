import { withTransientDbRetry } from '../utils/dbRetry.js';
import { isPrismaEnginePanicError } from '../utils/dbUnavailable.js';
import { initPrisma, resetPrismaEngine, prisma } from './prisma.js';

export let dbStatus: 'unknown' | 'ok' | 'error' = 'unknown';
export let lastDbCheck = 0;

export function isDatabaseHealthy(): boolean {
  return dbStatus === 'ok';
}

export function markDatabaseUnhealthy(): void {
  dbStatus = 'error';
}

export async function checkDatabaseHealth(): Promise<void> {
  try {
    await withTransientDbRetry(() => prisma.$queryRaw`SELECT 1`, {
      label: 'dbHealth',
      attempts: 2,
    });
    dbStatus = 'ok';
  } catch (e) {
    dbStatus = 'error';
    console.warn('[DB HEALTH] probe failed', e instanceof Error ? e.message : e);
    if (isPrismaEnginePanicError(e)) {
      void resetPrismaEngine()
        .then(() => initPrisma())
        .catch((resetErr) =>
          console.warn('[DB HEALTH] prisma reset failed', resetErr instanceof Error ? resetErr.message : resetErr),
        );
    }
  } finally {
    lastDbCheck = Date.now();
  }
}

/** Repeats every 30s; call after optional initial `await checkDatabaseHealth()`. */
export function startPeriodicDbHealthCheck(): void {
  setInterval(() => {
    void checkDatabaseHealth();
  }, 30000);
}

export async function safeDbCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const out = await fn();
    return out;
  } catch (err) {
    console.error('[DB ERROR]', err);
    dbStatus = 'error';
    throw err;
  }
}
