import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.QA_BASE_URL || 'https://baigdentpro.com').replace(/\/$/, '');
const API_BASE = (process.env.QA_API_BASE || `${BASE_URL}/api`).replace(/\/$/, '');
const PASSWORD = process.env.QA_DEMO_PASSWORD || 'Temp@12345';

const ROLES = [
  { role: 'SUPER_ADMIN', email: 'superadmin@demo.com', password: PASSWORD },
  { role: 'CLINIC_ADMIN', email: 'clinic@demo.com', password: PASSWORD },
  { role: 'DOCTOR', email: 'doctor@demo.com', password: PASSWORD },
  { role: 'STORE_MANAGER', email: 'shop@demo.com', password: PASSWORD },
];

function jsonPreview(v) {
  if (!v || typeof v !== 'object') return String(v).slice(0, 200);
  return Object.keys(v).slice(0, 12);
}

async function fetchJson(url, opts = {}) {
  const started = performance.now();
  const res = await fetch(url, opts);
  const elapsedMs = Math.round(performance.now() - started);
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // non-json
  }
  return { status: res.status, ok: res.ok, elapsedMs, body, headers: res.headers };
}

async function loginApi(email, password) {
  const r = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (typeof r.body === 'string' && r.body.toLowerCase().includes('<!doctype html>')) {
    return { ...r, ok: false, status: 0, body: { error: 'non_api_response_html' } };
  }
  return r;
}

function expectedAccess(role) {
  return {
    superAdmin: role === 'SUPER_ADMIN',
    dashboard: role !== 'STORE_MANAGER',
    shopAdmin: role === 'STORE_MANAGER' || role === 'CLINIC_ADMIN',
  };
}

async function runApiChecks(acc) {
  const report = {
    login: null,
    authMe: null,
    sessionPersistence: null,
    invalidCredentials: null,
    tokenExpiryBehavior: null,
    rbac: [],
    apiErrors: [],
  };

  report.login = await loginApi(acc.email, acc.password);
  if (!report.login.ok || !report.login.body?.token) {
    return report;
  }
  const token = report.login.body.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  report.authMe = await fetchJson(`${API_BASE}/auth/me`, { headers: authHeader });
  report.sessionPersistence = await fetchJson(`${API_BASE}/auth/me`, { headers: authHeader });

  report.invalidCredentials = await loginApi(acc.email, `${acc.password}-wrong`);

  const tampered = `${token}x`;
  report.tokenExpiryBehavior = await fetchJson(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${tampered}` },
  });

  const exp = expectedAccess(acc.role);
  const checks = [
    { path: '/super-admin/stats', shouldAllow: exp.superAdmin, label: 'super-admin access' },
    { path: '/dashboard/stats', shouldAllow: exp.dashboard, label: 'dpms dashboard access' },
    { path: '/shop/admin/products', shouldAllow: exp.shopAdmin, label: 'shop admin access' },
  ];
  for (const c of checks) {
    const r = await fetchJson(`${API_BASE}${c.path}`, { headers: authHeader });
    report.rbac.push({ ...c, status: r.status, ok: r.ok, preview: jsonPreview(r.body) });
    const allowed = r.status >= 200 && r.status < 300;
    if (allowed !== c.shouldAllow) {
      report.apiErrors.push({
        type: 'RBAC_MISMATCH',
        path: c.path,
        expectedAllow: c.shouldAllow,
        actualStatus: r.status,
      });
    }
  }

  return report;
}

async function runUiChecks(acc, browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedApi = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 400) {
      failedApi.push({ url, status: res.status() });
    }
  });

  const perf = {
    loginPageLoadMs: null,
    loginResponseMs: null,
    dashboardLoadMs: null,
  };
  const navigation = [];

  try {
    const t0 = performance.now();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    perf.loginPageLoadMs = Math.round(performance.now() - t0);

    const tLogin = performance.now();
    await page.fill('#login-email', acc.email);
    await page.fill('#login-password', acc.password);
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 45000 }),
      page.locator('form.neo-auth-form button[type="submit"]').click(),
    ]);
    perf.loginResponseMs = Math.round(performance.now() - tLogin);

    const tDash = performance.now();
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    perf.dashboardLoadMs = Math.round(performance.now() - tDash);

    const hrefs = await page.$$eval('aside.dashboard-sidebar a[href]', (els) =>
      [...new Set(els.map((a) => a.getAttribute('href')).filter(Boolean))]
    );
    const subset = hrefs.filter((h) => h.startsWith('/dashboard')).slice(0, 10);
    for (const href of subset) {
      try {
        await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(350);
        navigation.push({ href, ok: true });
      } catch (e) {
        navigation.push({ href, ok: false, error: String(e) });
      }
    }
  } catch (e) {
    navigation.push({ href: '/login', ok: false, error: String(e) });
  } finally {
    await context.close();
  }

  return { perf, navigation, consoleErrors, pageErrors, failedApi };
}

async function main() {
  const summary = {
    baseUrl: BASE_URL,
    ranAt: new Date().toISOString(),
    roles: [],
    global: {},
  };

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const acc of ROLES) {
      const api = await runApiChecks(acc);
      const ui = await runUiChecks(acc, browser);
      summary.roles.push({
        role: acc.role,
        email: acc.email,
        api,
        ui,
      });
    }
  } finally {
    await browser.close();
  }

  const outFile = fileURLToPath(new URL('../qa-e2e-results.json', import.meta.url));
  await writeFile(outFile, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outFile}`);
}

main().catch((err) => {
  console.error('[qa-e2e-all-portals] failed:', err);
  process.exit(1);
});

