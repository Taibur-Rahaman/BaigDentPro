import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../index.js';
import { verifySupabaseConnection } from '../config/supabase.js';
import { isDatabaseUnreachableError } from '../utils/dbUnavailable.js';

type TestTableRow = {
  id: number;
  name: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let tableReady = false;

export async function ensureTestTableExists(): Promise<void> {
  if (tableReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.test_table (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Supabase pooler/pgbouncer can raise prepared statement conflicts for raw DDL probes.
    if (!message.includes('42P05') && !message.includes('prepared statement "s0" already exists')) {
      throw error;
    }
    console.warn('[test_table] ignoring pooler prepared statement conflict during table check.');
  }

  tableReady = true;
}

export async function createTestRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      throw new HttpError(400, 'name is required');
    }

    await ensureTestTableExists();
    const created = await prisma.testTable.create({
      data: { name },
      select: { id: true, name: true },
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('CREATE ERROR:', error);
    next(error);
  }
}

export async function readTestRecords(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureTestTableExists();
    const rows = await prisma.testTable.findMany({
      orderBy: { id: 'desc' },
      select: { id: true, name: true },
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('READ ERROR:', error);
    next(error);
  }
}

export async function updateTestRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!Number.isFinite(id) || id <= 0) {
      throw new HttpError(400, 'id must be a positive integer');
    }
    if (!name) {
      throw new HttpError(400, 'name is required');
    }

    await ensureTestTableExists();
    const updated = await prisma.testTable.updateMany({
      where: { id },
      data: { name },
    });

    if (!updated.count) {
      throw new HttpError(404, `test_table row ${id} not found`);
    }
    const row = await prisma.testTable.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('UPDATE ERROR:', error);
    next(error);
  }
}

export async function deleteTestRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      throw new HttpError(400, 'id must be a positive integer');
    }

    await ensureTestTableExists();
    const existing = await prisma.testTable.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new HttpError(404, `test_table row ${id} not found`);
    }
    await prisma.testTable.delete({ where: { id } });
    res.status(200).json({ success: true, data: existing });
  } catch (error) {
    console.error('DELETE ERROR:', error);
    next(error);
  }
}

export async function testSystemStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabase = await verifySupabaseConnection();
    let testTableReady = false;
    let database: 'connected' | 'disconnected' = 'connected';
    let databaseError: string | undefined;

    try {
      await ensureTestTableExists();
      await prisma.$queryRaw`SELECT 1 FROM public.test_table LIMIT 1`;
      testTableReady = true;
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

    const hasMissingEnv = !process.env.DATABASE_URL?.trim() || !process.env.SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const statusCode = supabase.connected && testTableReady ? 200 : 503;
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
      testTableReady,
    });
  } catch (error) {
    next(error);
  }
}
