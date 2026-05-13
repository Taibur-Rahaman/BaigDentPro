/**
 * One-off ops: confirm SUPER_ADMIN seed user + bcrypt for configured seed secret.
 * Does not print DATABASE_URL or full password hash.
 *
 * Usage: cd server && npx tsx scripts/verify-superadmin.ts
 */
import '../src/bootstrap-env.js';

import bcrypt from 'bcryptjs';
import { prismaBase } from '../src/db/prisma.js';

const EMAIL = (process.env.SUPERADMIN_SEED_EMAIL || '').trim().toLowerCase();
const EXPECTED_PASSWORD = (process.env.SUPERADMIN_SEED_PASSWORD || '').trim();

function dbTargetLabel(): string {
  const raw = (process.env.DATABASE_URL ?? '').trim();
  if (!raw) return '(no DATABASE_URL)';
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

async function main(): Promise<void> {
  if (!EMAIL || !EXPECTED_PASSWORD) {
    console.error('[verify-superadmin] Missing SUPERADMIN_SEED_EMAIL or SUPERADMIN_SEED_PASSWORD');
    process.exit(1);
  }
  console.info('[verify-superadmin] db_target=', dbTargetLabel());

  const user = await prismaBase.user.findFirst({
    where: { email: { equals: EMAIL, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      isApproved: true,
      password: true,
    },
  });

  if (!user) {
    console.error('[verify-superadmin] MISSING — run: npm run db:seed (production-safe upsert)');
    await prismaBase.$disconnect();
    process.exit(1);
  }

  const hashLen = user.password.length;
  const hashPrefix = `${user.password.slice(0, 4)}…(${hashLen} chars)`;
  const passwordOk = await bcrypt.compare(EXPECTED_PASSWORD, user.password);

  console.info('[verify-superadmin] user', {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isApproved: user.isApproved,
    bcryptHashPrefix: hashPrefix,
    passwordMatchesSuper123: passwordOk,
  });

  if (!passwordOk) {
    console.error('[verify-superadmin] bcrypt mismatch — run: npm run db:seed');
  }
  if (!user.isActive || !user.isApproved) {
    console.error('[verify-superadmin] account gated — isActive / isApproved must be true for login');
  }
  if (user.role !== 'SUPER_ADMIN') {
    console.warn('[verify-superadmin] role is not SUPER_ADMIN (expected SUPER_ADMIN)');
  }

  await prismaBase.$disconnect();
  process.exit(passwordOk && user.isActive && user.isApproved && user.role === 'SUPER_ADMIN' ? 0 : 1);
}

void main();
