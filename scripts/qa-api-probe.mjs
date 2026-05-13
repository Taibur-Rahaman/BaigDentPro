/**
 * Authenticated API probes after POST /api/auth/login.
 * Usage: node scripts/qa-api-probe.mjs
 */
import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API = (process.env.QA_API_BASE || 'http://localhost:5000/api').replace(/\/$/, '');

const ACCOUNTS = [
  { role: 'SUPER_ADMIN', email: 'qa.superadmin@baigdentpro.test', password: 'QATest_SuperAdmin_Seed_2026!' },
  { role: 'CLINIC_ADMIN', email: 'demo@baigdentpro.com', password: 'QATest_Demo_Seed_2026!' },
  { role: 'DOCTOR', email: 'doctor@baigdentpro.com', password: 'QATest_Demo_Seed_2026!' },
  { role: 'RECEPTIONIST', email: 'receptionist@baigdentpro.com', password: 'QATest_Demo_Seed_2026!' },
  { role: 'TENANT', email: 'tenant@baigdentpro.com', password: 'QATest_Demo_Seed_2026!' },
];

async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} login ${JSON.stringify(j)}`);
  return j.token;
}

const FETCH_MS = 25_000;

async function get(token, path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { path, status: r.status, ok: r.ok, bodyPreview: typeof body === 'object' ? Object.keys(body).slice(0, 8) : body };
}

async function postJson(token, path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_MS),
  });
  const text = await r.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 200);
  }
  return {
    path,
    status: r.status,
    ok: r.ok,
    bodyPreview: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).slice(0, 12) : parsed,
  };
}

/** Extra probes: manual WhatsApp subscription initiate, PDF, multipart upload. */
async function extendedProbes(role, token, push) {
  if (role === 'CLINIC_ADMIN') {
    push(await postJson(token, '/payment/manual/initiate', { planCode: 'FREE' }));
  }

  if (role === 'DOCTOR') {
    const list = await fetch(`${API}/prescriptions?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    const j = await list.json().catch(() => ({}));
    const first = Array.isArray(j.prescriptions) && j.prescriptions[0]?.id ? j.prescriptions[0].id : null;
    if (first) {
      const r = await fetch(`${API}/prescriptions/${encodeURIComponent(first)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(FETCH_MS),
      });
      const ct = r.headers.get('content-type') || '';
      const buf = await r.arrayBuffer();
      push({
        path: `/prescriptions/${first}/pdf`,
        status: r.status,
        ok: r.status === 200 && ct.includes('pdf'),
        bodyPreview: r.ok ? `content-type:${ct};bytes:${buf.byteLength}` : `status:${r.status}`,
      });
    } else {
      push({
        path: '/prescriptions/{id}/pdf',
        status: 0,
        ok: true,
        bodyPreview: 'skipped:no-prescription-rows',
      });
    }
  }

  if (role === 'TENANT') {
    const fd = new FormData();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    fd.append('file', new Blob([png], { type: 'image/png' }), 'qa-probe.png');
    fd.append('assetType', 'general');
    const r = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      signal: AbortSignal.timeout(FETCH_MS),
    });
    const text = await r.text();
    let preview = text.slice(0, 120);
    try {
      const o = JSON.parse(text);
      preview = typeof o === 'object' ? Object.keys(o).slice(0, 8).join(',') : preview;
    } catch {
      /* ignore */
    }
    push({ path: '/upload', status: r.status, ok: r.ok, bodyPreview: preview });
  }
}

function probesForRole(role) {
  const common = [
    '/auth/me',
    '/dashboard/stats',
    '/dashboard/today',
    '/dashboard/recent-patients',
    '/branding/public',
    '/shop/products',
    '/shop/products/categories',
    '/shop/cart',
  ];
  const activityTimeline = ['/activity/timeline?page=1&limit=10'];
  const clinical = [
    ...activityTimeline,
    '/patients',
    '/appointments/today',
    '/prescriptions',
    '/invoices',
    '/lab/pending',
    '/communication/sms/logs',
    '/communication/email/logs',
    '/settings',
  ];
  const tenantShop = ['/products', '/orders', '/shop/admin/products', '/shop/admin/orders'];
  const superOnly = [
    '/super-admin/clinics',
    '/super-admin/stats',
    '/super-admin/pending-signups',
    '/admin/stats',
    '/admin/clinics',
    '/admin/audit-logs',
  ];

  if (role === 'SUPER_ADMIN') return [...common, ...clinical, ...superOnly];
  if (role === 'TENANT') return [...common, ...tenantShop];
  return [...common, ...clinical, '/products', '/orders'];
}

async function main() {
  const results = [];
  for (const acc of ACCOUNTS) {
    const row = { role: acc.role, email: acc.email, probes: [], error: null };
    try {
      const token = await login(acc.email, acc.password);
      const paths = probesForRole(acc.role);
      for (const p of paths) {
        try {
          row.probes.push(await get(token, p));
        } catch (e) {
          row.probes.push({ path: p, status: 0, ok: false, bodyPreview: String(e) });
        }
      }
      await extendedProbes(acc.role, token, (probe) => row.probes.push(probe));
    } catch (e) {
      row.error = String(e);
    }
    results.push(row);
  }

  const outFile = fileURLToPath(new URL('../qa-api-results.json', import.meta.url));
  await writeFile(outFile, JSON.stringify(results, null, 2));
  console.log('Wrote', outFile);

  const bad = results.flatMap((r) => r.probes.filter((p) => !p.ok && p.status !== 403 && p.status !== 401));
  if (bad.length) {
    console.error('Non-OK probes (excluding 401/403):', bad.length);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
