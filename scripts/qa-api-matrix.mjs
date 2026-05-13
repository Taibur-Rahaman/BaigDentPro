#!/usr/bin/env node
/**
 * BaigDentPro API smoke matrix — hits authenticated routes per seeded role.
 * Usage: node scripts/qa-api-matrix.mjs [BASE=http://127.0.0.1:5000]
 */
const BASE = (process.argv[2] || process.env.API_BASE || 'http://127.0.0.1:5000').replace(/\/$/, '');
const PASS = process.env.QA_DEMO_PASSWORD || 'TestSeed123a1';
const SUPER_PASS = process.env.QA_SUPER_PASSWORD || 'TestSeed123a1';

const accounts = [
  { name: 'SUPER_ADMIN', email: 'superadmin@baigdentpro.local', password: SUPER_PASS },
  { name: 'CLINIC_ADMIN', email: 'demo@baigdentpro.com', password: PASS },
  { name: 'DOCTOR', email: 'doctor@baigdentpro.com', password: PASS },
  { name: 'RECEPTIONIST', email: 'receptionist@baigdentpro.com', password: PASS },
  { name: 'TENANT', email: 'tenant@baigdentpro.com', password: PASS },
];

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: `login ${r.status} ${j.error || JSON.stringify(j)}` };
  if (!j.token) return { error: 'no token' };
  return { token: j.token };
}

async function get(path, token, expect = []) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60000),
  });
  const text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    j = text;
  }
  const ok = expect.length ? expect.includes(r.status) : r.ok;
  return { path, status: r.status, ok, snippet: typeof j === 'string' ? j.slice(0, 120) : JSON.stringify(j).slice(0, 200) };
}

const routesByRole = {
  SUPER_ADMIN: [
    '/api/auth/me',
    '/api/admin/stats',
    '/api/super-admin/stats',
    '/api/branding/public',
  ],
  CLINIC_ADMIN: [
    '/api/auth/me',
    '/api/patients',
    '/api/dashboard/stats',
    '/api/dashboard/recent-patients',
    '/api/appointments',
    '/api/prescriptions',
    '/api/products',
    '/api/orders',
    '/api/settings',
    '/api/shop/admin/products',
    '/api/activity?take=5',
    '/api/branding/public',
    '/api/clinic/branches',
  ],
  DOCTOR: [
    '/api/auth/me',
    '/api/patients',
    '/api/prescriptions',
    '/api/dashboard/stats',
    '/api/invoices',
  ],
  RECEPTIONIST: [
    '/api/auth/me',
    '/api/patients',
    '/api/appointments/today',
    '/api/dashboard/stats',
    '/api/shop/products',
  ],
  TENANT: ['/api/auth/me', '/api/orders', '/api/shop/products', '/api/branding/public'],
};

async function main() {
  const failures = [];
  for (const acc of accounts) {
    const L = await login(acc.email, acc.password);
    if (L.error) {
      failures.push({ role: acc.name, phase: 'login', detail: L.error });
      console.error('FAIL LOGIN', acc.name, L.error);
      continue;
    }
    const token = L.token;
    const paths = routesByRole[acc.name];
    if (!paths) continue;
    for (const p of paths) {
      const exp = [200, 400, 403, 404];
      const res = await get(p, token, exp);
      if (!exp.includes(res.status)) {
        failures.push({ role: acc.name, path: p, status: res.status, snippet: res.snippet });
      }
      if (res.status >= 500) {
        failures.push({ role: acc.name, path: p, status: res.status, snippet: res.snippet });
      }
      process.stdout.write(res.status >= 400 ? `!` : `.`);
    }
    console.log(` ${acc.name}`);
  }

  console.log('\n--- failures ---');
  console.log(JSON.stringify(failures, null, 2));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
