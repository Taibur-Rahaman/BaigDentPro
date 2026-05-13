/**
 * Audit demo/platform accounts on the DB pointed at by server/.env (DATABASE_URL).
 * Optionally upsert missing rows (APPLY_ACCOUNT_FIX=1) using bcrypt cost 12.
 *
 * Usage:
 *   cd server && npx tsx scripts/demo-account-health.ts
 *   APPLY_ACCOUNT_FIX=1 npx tsx scripts/demo-account-health.ts        # create missing users only
 *   APPLY_ACCOUNT_HEAL=1 npx tsx scripts/demo-account-health.ts       # align role/clinic/flags (no password change)
 *   LOGIN_HTTP_TEST=1 npx tsx scripts/demo-account-health.ts   # POST /api/auth/login on localhost:PORT
 *
 * Does not print DATABASE_URL, JWT_SECRET, or raw password hashes.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../src/bootstrap-env.js';

import bcrypt from 'bcryptjs';
import { prismaBase } from '../src/db/prisma.js';

const EMAILS = [
  'superadmin@baigdentpro.com',
  'demo@baigdentpro.com',
  'clinic@baigdentpro.com',
  'doctor@baigdentpro.com',
  'store@baigdentpro.com',
] as const;

const DEFAULT_CLINIC_ID = 'seed-clinic-baigdentpro';
const TENANT_SHOP_CLINIC_ID = 'seed-tenant-shop-clinic';

type ExpectedShape = {
  email: (typeof EMAILS)[number];
  role: string;
  clinicId: string;
  name: string;
};

const EXPECTED: ExpectedShape[] = [
  { email: 'superadmin@baigdentpro.com', role: 'SUPER_ADMIN', clinicId: DEFAULT_CLINIC_ID, name: 'Super Admin' },
  { email: 'demo@baigdentpro.com', role: 'CLINIC_ADMIN', clinicId: DEFAULT_CLINIC_ID, name: 'Dr. Demo' },
  { email: 'clinic@baigdentpro.com', role: 'CLINIC_ADMIN', clinicId: DEFAULT_CLINIC_ID, name: 'Clinic Admin' },
  { email: 'doctor@baigdentpro.com', role: 'DOCTOR', clinicId: DEFAULT_CLINIC_ID, name: 'Dr. Associate' },
  { email: 'store@baigdentpro.com', role: 'STORE_MANAGER', clinicId: TENANT_SHOP_CLINIC_ID, name: 'Store Manager' },
];

function truthy(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

async function detectPasswordLabel(hash: string): Promise<string | null> {
  const candidates: Array<{ label: string; password: string }> = [];
  const demo = process.env.DEMO_SEED_PASSWORD?.trim();
  const superPw = process.env.SUPERADMIN_SEED_PASSWORD?.trim();
  const legacy = ['password123', 'Temp@12345'];
  if (demo) candidates.push({ label: 'DEMO_SEED_PASSWORD', password: demo });
  if (superPw) candidates.push({ label: 'SUPERADMIN_SEED_PASSWORD', password: superPw });
  for (const p of legacy) candidates.push({ label: `legacy:${p === 'password123' ? 'password123' : 'Temp@12345'}`, password: p });

  for (const { label, password } of candidates) {
    try {
      if (await bcrypt.compare(password, hash)) return label;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function ensureInfrastructure(): Promise<void> {
  await prismaBase.clinic.upsert({
    where: { id: DEFAULT_CLINIC_ID },
    update: { name: 'BaigDentPro Dental Clinic', plan: 'PREMIUM', isActive: true },
    create: {
      id: DEFAULT_CLINIC_ID,
      name: 'BaigDentPro Dental Clinic',
      plan: 'PREMIUM',
      isActive: true,
      phone: '+880 1601-677122',
      email: 'info@baigdentpro.com',
    },
  });

  await prismaBase.clinic.upsert({
    where: { id: TENANT_SHOP_CLINIC_ID },
    update: { name: 'Demo Shop Tenant', isActive: true, plan: 'FREE' },
    create: {
      id: TENANT_SHOP_CLINIC_ID,
      name: 'Demo Shop Tenant',
      plan: 'FREE',
      isActive: true,
    },
  });

  const premium = await prismaBase.plan.findUnique({ where: { name: 'PREMIUM' } });
  const free = await prismaBase.plan.findUnique({ where: { name: 'FREE' } });

  await prismaBase.subscription.upsert({
    where: { clinicId: DEFAULT_CLINIC_ID },
    update: {
      plan: 'PREMIUM',
      planId: premium?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
    create: {
      clinicId: DEFAULT_CLINIC_ID,
      plan: 'PREMIUM',
      planId: premium?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });

  await prismaBase.subscription.upsert({
    where: { clinicId: TENANT_SHOP_CLINIC_ID },
    update: {
      plan: 'FREE',
      planId: free?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
    create: {
      clinicId: TENANT_SHOP_CLINIC_ID,
      plan: 'FREE',
      planId: free?.id ?? null,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });
}

async function createUserIfAbsent(spec: ExpectedShape, plainPassword: string): Promise<void> {
  const existing = await prismaBase.user.findUnique({ where: { email: spec.email }, select: { id: true } });
  if (existing) return;

  const hash = await bcrypt.hash(plainPassword, 12);
  const row = await prismaBase.user.create({
    data: {
      email: spec.email,
      password: hash,
      name: spec.name,
      role: spec.role,
      clinicId: spec.clinicId,
      clinicName: spec.clinicId === DEFAULT_CLINIC_ID ? 'BaigDentPro Dental Clinic' : 'Demo Shop Tenant',
      isActive: true,
      isApproved: true,
      accountStatus: spec.role === 'SUPER_ADMIN' ? 'ACTIVE' : 'ACTIVE',
    },
  });

  if (spec.role === 'CLINIC_ADMIN' && spec.email === 'demo@baigdentpro.com') {
    await prismaBase.clinic.update({
      where: { id: DEFAULT_CLINIC_ID },
      data: { ownerId: row.id, plan: 'PREMIUM', isDemo: true },
    });
  }
  if (spec.role === 'STORE_MANAGER') {
    await prismaBase.clinic.update({
      where: { id: TENANT_SHOP_CLINIC_ID },
      data: { ownerId: row.id },
    });
  }
}

/** Repair login gates without changing password (APPLY_ACCOUNT_HEAL=1). */
async function healUserFlags(spec: ExpectedShape): Promise<void> {
  await prismaBase.user.updateMany({
    where: { email: spec.email },
    data: {
      role: spec.role,
      clinicId: spec.clinicId,
      clinicName: spec.clinicId === DEFAULT_CLINIC_ID ? 'BaigDentPro Dental Clinic' : 'Demo Shop Tenant',
      isActive: true,
      isApproved: true,
      accountStatus: 'ACTIVE',
    },
  });
}

function resolveFixPassword(spec: ExpectedShape): string | null {
  if (spec.role === 'SUPER_ADMIN') {
    const p =
      process.env.FIX_SUPERADMIN_PASSWORD?.trim() ||
      process.env.SUPERADMIN_SEED_PASSWORD?.trim();
    return p || null;
  }
  const p = process.env.FIX_DEMO_PASSWORD?.trim() || process.env.DEMO_SEED_PASSWORD?.trim();
  return p || null;
}

async function migrateStatusSummary(): Promise<{ ok: boolean; stdout: string }> {
  const { execFile } = await import('node:child_process');
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '../..');
  const prismaBin = path.join(repoRoot, 'node_modules/.bin/prisma');
  const cwd = path.join(repoRoot, 'server');
  return new Promise((resolve) => {
    execFile(prismaBin, ['migrate', 'status'], { cwd, maxBuffer: 2_000_000 }, (err, stdout, stderr) => {
      const out = `${stdout}\n${stderr}`.trim();
      resolve({ ok: !err, stdout: out.slice(0, 4000) });
    });
  });
}

async function httpLogin(email: string, password: string): Promise<{ status: number; body: string }> {
  const port = process.env.PORT?.trim() || '5000';
  const url = `http://127.0.0.1:${port}/api/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 800) };
}

async function pickWorkingPassword(email: string, hash: string): Promise<string | null> {
  const ordered: string[] = [];
  const demo = process.env.DEMO_SEED_PASSWORD?.trim();
  const superPw = process.env.SUPERADMIN_SEED_PASSWORD?.trim();
  if (email === 'superadmin@baigdentpro.com' && superPw) ordered.push(superPw);
  if (email !== 'superadmin@baigdentpro.com' && demo) ordered.push(demo);
  ordered.push('password123', 'Temp@12345');
  const uniq = [...new Set(ordered.filter(Boolean))];
  for (const p of uniq) {
    try {
      if (await bcrypt.compare(p, hash)) return p;
    } catch {
      /* */
    }
  }
  return null;
}

async function main(): Promise<void> {
  const applyFix = truthy(process.env.APPLY_ACCOUNT_FIX);
  const applyHeal = truthy(process.env.APPLY_ACCOUNT_HEAL);
  const loginHttp = truthy(process.env.LOGIN_HTTP_TEST);

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('[demo-account-health] DATABASE_URL missing');
    process.exit(1);
  }

  console.log('[demo-account-health] DB host (redacted):', (() => {
    try {
      return new URL(process.env.DATABASE_URL!).hostname;
    } catch {
      return '(unparsed)';
    }
  })());

  const migrate = await migrateStatusSummary();
  console.log('[demo-account-health] prisma migrate status OK=', migrate.ok);

  const rows = await prismaBase.user.findMany({
    where: { email: { in: [...EMAILS] } },
    select: {
      email: true,
      role: true,
      isActive: true,
      isApproved: true,
      accountStatus: true,
      password: true,
      clinicId: true,
      clinic: { select: { id: true } },
    },
  });
  const byEmail = new Map(rows.map((r) => [r.email, r]));

  console.log('\n=== ACCOUNT AUDIT ===');
  for (const spec of EXPECTED) {
    const u = byEmail.get(spec.email);
    if (!u) {
      console.log(JSON.stringify({ email: spec.email, exists: false }));
      continue;
    }
    const clinicOk = Boolean(u.clinicId?.length && u.clinic?.id === u.clinicId);
    const hashOk = typeof u.password === 'string' && u.password.startsWith('$2');
    const pwdLabel = hashOk ? await detectPasswordLabel(u.password) : null;
    console.log(
      JSON.stringify({
        email: spec.email,
        exists: true,
        role: u.role,
        roleExpected: spec.role,
        roleMatch: u.role === spec.role,
        isActive: u.isActive,
        isApproved: u.isApproved,
        accountStatus: u.accountStatus,
        passwordHashPresent: hashOk,
        passwordMatchesKnownSecret: pwdLabel,
        clinicId: u.clinicId,
        clinicRowExists: clinicOk,
        clinicIdExpected: spec.clinicId,
        clinicIdMatch: u.clinicId === spec.clinicId,
      }),
    );
  }

  if (applyFix || applyHeal) {
    await ensureInfrastructure();
  }

  if (applyFix) {
    console.log('\n=== APPLY ACCOUNT FIX (create missing only — never duplicates email) ===');
    for (const spec of EXPECTED) {
      const pw = resolveFixPassword(spec);
      if (!pw) {
        console.warn('[demo-account-health] skip create — missing password env for', spec.email);
        continue;
      }
      const before = await prismaBase.user.findUnique({ where: { email: spec.email }, select: { id: true } });
      await createUserIfAbsent(spec, pw);
      const after = await prismaBase.user.findUnique({ where: { email: spec.email }, select: { id: true } });
      console.log(
        JSON.stringify({
          email: spec.email,
          action: before ? 'already_present' : 'created',
          created: !before && Boolean(after),
        }),
      );
    }
  }

  if (applyHeal) {
    console.log('\n=== APPLY ACCOUNT HEAL (role/clinic/active/approved/status — password unchanged) ===');
    for (const spec of EXPECTED) {
      const exists = await prismaBase.user.findUnique({ where: { email: spec.email }, select: { id: true } });
      if (!exists) {
        console.warn('[demo-account-health] heal skip — user missing', spec.email);
        continue;
      }
      await healUserFlags(spec);
      console.log('[demo-account-health] healed flags', spec.email);
    }
  }

  if (loginHttp) {
    if (!process.env.JWT_SECRET?.trim()) {
      console.error('[demo-account-health] LOGIN_HTTP_TEST requires JWT_SECRET in server/.env');
    } else {
      console.log('\n=== HTTP LOGIN (localhost) ===');
      const refreshed = await prismaBase.user.findMany({
        where: { email: { in: [...EMAILS] } },
        select: { email: true, password: true },
      });
      for (const spec of EXPECTED) {
        const u = refreshed.find((r) => r.email === spec.email);
        if (!u) {
          console.log(JSON.stringify({ email: spec.email, httpLogin: 'SKIP', reason: 'user_missing' }));
          continue;
        }
        const pw = await pickWorkingPassword(spec.email, u.password);
        if (!pw) {
          console.log(JSON.stringify({ email: spec.email, httpLogin: 'FAIL', reason: 'no_known_plaintext_match' }));
          continue;
        }
        try {
          const r = await httpLogin(spec.email, pw);
          const ok = r.status === 200;
          let reason = `HTTP_${r.status}`;
          if (!ok) {
            try {
              const j = JSON.parse(r.body) as { error?: string; code?: string };
              reason = [j.code, j.error].filter(Boolean).join(' — ') || reason;
            } catch {
              reason = r.body.slice(0, 200) || reason;
            }
          }
          console.log(JSON.stringify({ email: spec.email, httpLogin: ok ? 'PASS' : 'FAIL', reason }));
        } catch (e) {
          console.log(
            JSON.stringify({
              email: spec.email,
              httpLogin: 'FAIL',
              reason: e instanceof Error ? e.message : String(e),
            }),
          );
        }
      }
    }
  }

  await prismaBase.$disconnect();
}

void main().catch(async (e) => {
  console.error('[demo-account-health] fatal', e instanceof Error ? e.message : e);
  await prismaBase.$disconnect().catch(() => {});
  process.exit(1);
});
