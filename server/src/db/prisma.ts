import { PrismaClient } from '@prisma/client';
import { attachEmrTenantExtension } from '../prisma/emrTenantExtension.js';

function getPrismaDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    const isSupabasePooler = parsed.hostname.includes('pooler.supabase.com');
    if (isSupabasePooler) {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
      // PgBouncer transaction pool: disable client prepared statement cache (avoids "prepared statement sN does not exist").
      if (!parsed.searchParams.has('statement_cache_size')) {
        parsed.searchParams.set('statement_cache_size', '0');
      }
      if (!parsed.searchParams.has('connection_limit')) {
        // Default was 1 — with PgBouncer that exhausts under concurrent HTTP + multi-query handlers (login + dashboard).
        const rawLimit = process.env.PRISMA_SUPABASE_POOL_CONNECTION_LIMIT?.trim();
        const n = rawLimit ? parseInt(rawLimit, 10) : NaN;
        const limit = Number.isFinite(n) && n > 0 ? n : 5;
        parsed.searchParams.set('connection_limit', String(limit));
      }
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

let prismaBaseInstance: PrismaClient | undefined;
let prismaExtendedInstance: ReturnType<typeof attachEmrTenantExtension> | undefined;

function ensurePrisma(): void {
  if (prismaExtendedInstance) return;
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error('DATABASE_URL is not configured — set it before using the database');
  }
  prismaBaseInstance = new PrismaClient({
    datasources: {
      db: {
        url: getPrismaDatasourceUrl(),
      },
    },
  });
  prismaExtendedInstance = attachEmrTenantExtension(prismaBaseInstance);
}

function proxyDb<T extends object>(pick: 'base' | 'extended'): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      ensurePrisma();
      const client =
        pick === 'base'
          ? (prismaBaseInstance as unknown as object)
          : (prismaExtendedInstance as unknown as object);
      const value = Reflect.get(client, prop, receiver);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value;
    },
  });
}

/** Raw Prisma client — instantiated on first use (after listen-safe boot). */
export const prismaBase = proxyDb<PrismaClient>('base');

/** Default app client — EMR models merge `businessClinicContext` when active. */
export const prisma = proxyDb<ReturnType<typeof attachEmrTenantExtension>>('extended');

export async function disconnectPrisma(): Promise<void> {
  if (prismaBaseInstance) {
    await prismaBaseInstance.$disconnect();
    prismaBaseInstance = undefined;
    prismaExtendedInstance = undefined;
  }
}
