/**
 * Terminal DB smoke test: loads server/.env (via bootstrap-env) and runs SELECT 1 via Prisma.
 * Does not print DATABASE_URL or passwords.
 *
 * Usage (from repo): cd server && npm run db:test
 */
import '../src/bootstrap-env.js';

import { prismaBase } from '../src/db/prisma.js';
import { hintForDbFailure, testDB } from '../src/utils/dbTest.js';

function summarizeEnv(): void {
  const raw = (process.env.DATABASE_URL ?? '').trim();
  if (!raw) {
    console.error('[db:test] DATABASE_URL is not set in server/.env');
    process.exit(1);
  }
  try {
    const u = new URL(raw);
    const host = u.hostname || '(unknown)';
    const port = u.port || '5432';
    const isSupabase =
      host.includes('supabase.com') || host.includes('supabase.co') || host.includes('pooler.supabase.com');
    console.info(`[db:test] parsed host=${host} port=${port} isSupabase=${isSupabase}`);
  } catch {
    console.error('[db:test] DATABASE_URL is not a valid URL');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  summarizeEnv();
  const db = await testDB();
  if (db.ok) {
    console.info('[db:test] SUCCESS — database reachable');
    await prismaBase.$disconnect();
    return;
  }
  console.error('[db:test] FAILURE —', db.error);
  console.error('[db:test] errorType=', db.type);
  console.error('[db:test] hint=', hintForDbFailure(db.type));
  await prismaBase.$disconnect();
  process.exit(1);
}

void main();
