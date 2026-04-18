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
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1');
      }
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

/** Raw Prisma client (admin jobs, audit writes, seeds). Avoid for EMR business paths. */
export const prismaBase = new PrismaClient({
  datasources: {
    db: {
      url: getPrismaDatasourceUrl(),
    },
  },
});

/** Default app client — EMR models merge `businessClinicContext` when active. */
export const prisma = attachEmrTenantExtension(prismaBase);
