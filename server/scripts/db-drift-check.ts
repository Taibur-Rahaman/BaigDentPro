/**
 * Compare Prisma datamodel to live DB (via datasource URLs) and emit JSON.
 * Uses `prisma migrate diff`; optional `--fail-on-drift` exits non-zero when drift exists.
 *
 * Usage (from server): npx tsx scripts/db-drift-check.ts [--fail-on-drift]
 */
import '../src/bootstrap-env.js';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { prismaBase } from '../src/db/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');

function run(cmd: string, maxBuffer = 12 * 1024 * 1024): string {
  return execSync(cmd, { cwd: serverRoot, encoding: 'utf8', maxBuffer });
}

function runExit(cmd: string): number {
  try {
    execSync(cmd, { cwd: serverRoot, encoding: 'utf8', stdio: 'pipe', maxBuffer: 12 * 1024 * 1024 });
    return 0;
  } catch (e: unknown) {
    return (e as { status?: number }).status ?? 1;
  }
}

function humanDiffLines(): string[] {
  const stdout = run(
    'npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma'
  );
  return stdout
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
}

function sqlDiffScript(): string {
  try {
    return run(
      'npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script'
    ).trim();
  } catch {
    return '';
  }
}

function classifySeverity(script: string, humanLines: string[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!script && humanLines.length === 0) return 'LOW';

  if (
    /\bDROP\s+TABLE\b/i.test(script) ||
    /\bDROP\s+COLUMN\b/i.test(script) ||
    /\bTRUNCATE\b/i.test(script)
  ) {
    return 'HIGH';
  }
  if (/DROP\s+CONSTRAINT/i.test(script) && !/DROP\s+DEFAULT/i.test(script)) {
    return 'MEDIUM';
  }
  const joined = humanLines.join(' ');
  if (joined.includes('[+] Added foreign key') || /\bFOREIGN\s+KEY\b/i.test(script)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/** Expected physical table names from prisma/schema.prisma (public). */
function expectedTablesFromSchema(schemaText: string): Set<string> {
  const names = new Set<string>();
  const parts = schemaText.split(/^model\s+/m).slice(1);
  for (const part of parts) {
    const modelMatch = /^(\w+)/.exec(part);
    if (!modelMatch) continue;
    const blockUntilNext = part.split(/^model\s+/m)[0] ?? part;
    const mapMatch = /@@map\("([^"]+)"\)/.exec(blockUntilNext);
    names.add(mapMatch ? mapMatch[1] : modelMatch[1]);
  }
  return names;
}

async function publicTableNames(): Promise<string[]> {
  const rows = await prismaBase.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}

async function main(): Promise<void> {
  const failOnDrift = process.argv.includes('--fail-on-drift');

  const schemaText = readFileSync(schemaPath, 'utf8');
  const expected = expectedTablesFromSchema(schemaText);

  const dbTables = await publicTableNames();
  const dbSet = new Set(dbTables);

  const systemTables = new Set(['_prisma_migrations']);
  const expectedOnly = [...expected].filter((t) => !dbSet.has(t));
  const extraInDb = dbTables.filter((t) => !expected.has(t) && !systemTables.has(t));

  const exitDiff = runExit(
    'npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code'
  );
  const diffFromPrisma = exitDiff === 2;

  const humanLines = diffFromPrisma || exitDiff === 0 ? humanDiffLines() : [];
  const script = diffFromPrisma || exitDiff === 0 ? sqlDiffScript() : '';

  if (exitDiff !== 0 && exitDiff !== 2) {
    console.error(`[db-drift-check] prisma migrate diff failed (exit ${exitDiff}).`);
    process.exit(1);
  }

  const drift = diffFromPrisma || expectedOnly.length > 0 || extraInDb.length > 0;
  const differences: string[] = [
    ...humanLines,
    ...(expectedOnly.length ? [`missing_tables: ${expectedOnly.join(', ')}`] : []),
    ...(extraInDb.length ? [`extra_tables: ${extraInDb.join(', ')}`] : []),
  ];

  const severity = drift ? classifySeverity(script, humanLines) : 'LOW';

  const out = {
    drift,
    differences,
    severity,
    expected_table_count: expected.size,
    db_table_count: dbTables.length,
    missing_tables: expectedOnly,
    extra_tables: extraInDb,
  };

  console.log(JSON.stringify(out, null, 2));

  if (failOnDrift && drift) {
    console.error('[db-drift-check] Drift detected — blocking.');
    process.exit(1);
  }

  await prismaBase.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prismaBase.$disconnect().catch(() => {});
  process.exit(1);
});
