import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../index.js';
import { verifySupabaseConnection } from '../config/supabase.js';
import { isDatabaseUnreachableError } from '../utils/dbUnavailable.js';

/**
 * Authenticated diagnostics: DB + Supabase + tenant catalog probe (Product model).
 * Replaces legacy `test_table` connectivity checks.
 */
export async function testSystemStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = await verifySupabaseConnection();
    let database: 'connected' | 'disconnected' = 'connected';
    let databaseError: string | undefined;
    let catalogProbe = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.product.findFirst({ take: 1, select: { id: true } });
      catalogProbe = true;
    } catch (error) {
      database = 'disconnected';
      if (isDatabaseUnreachableError(error)) {
        const msg = error instanceof Error ? error.message : String(error);
        databaseError = msg.includes('Authentication failed')
          ? 'Prisma authentication failed. Verify DATABASE_URL username/password and URL encoding.'
          : 'Database is not reachable from runtime.';
      } else {
        databaseError = error instanceof Error ? error.message : String(error);
      }
      console.error('[test/status] database check failed:', databaseError);
    }

    const hasMissingEnv =
      !process.env.DATABASE_URL?.trim() || !process.env.SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const statusCode = supabase.connected && database === 'connected' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
        hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
        hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
        hasMissingEnv,
      },
      database,
      ...(databaseError ? { databaseError } : {}),
      supabase,
      catalogProbe,
    });
  } catch (error) {
    next(error);
  }
}
