import { prisma } from './prisma.js';

export let dbStatus: 'unknown' | 'ok' | 'error' = 'unknown';
export let lastDbCheck = 0;

export async function checkDatabaseHealth(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch (e) {
    dbStatus = 'error';
    console.warn('[DB HEALTH] probe failed', e instanceof Error ? e.message : e);
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
