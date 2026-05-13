/**
 * Playwright UI crawl: login per role, visit all sidebar links, click non-destructive buttons.
 * Run with: node scripts/qa-ui-crawl.mjs
 * Requires: dev servers (vite + api), Chrome installed (channel: chrome).
 */
import { chromium } from 'playwright-core';

/** Default matches Vite dev (often IPv6 localhost-only — use hostname not 127.0.0.1). */
const BASE = process.env.QA_BASE_URL || 'http://localhost:5173';

const ROLES_ALL = [
  {
    name: 'SUPER_ADMIN',
    email: 'qa.superadmin@baigdentpro.test',
    password: 'QATest_SuperAdmin_Seed_2026!',
  },
  {
    name: 'CLINIC_ADMIN',
    email: 'demo@baigdentpro.com',
    password: 'QATest_Demo_Seed_2026!',
  },
  {
    name: 'DOCTOR',
    email: 'doctor@baigdentpro.com',
    password: 'QATest_Demo_Seed_2026!',
  },
  {
    name: 'RECEPTIONIST',
    email: 'receptionist@baigdentpro.com',
    password: 'QATest_Demo_Seed_2026!',
  },
  {
    name: 'TENANT',
    email: 'tenant@baigdentpro.com',
    password: 'QATest_Demo_Seed_2026!',
  },
];

const ONLY = (process.env.QA_UI_ROLES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ROLES = ONLY.length ? ROLES_ALL.filter((r) => ONLY.includes(r.name)) : ROLES_ALL;

function shouldSkipButtonText(t) {
  const s = (t || '').trim().toLowerCase();
  if (!s) return true;
  if (s.includes('logout') || s.includes('log out')) return true;
  if (s.includes('delete') || s.includes('remove')) return true;
  if (s.includes('cancel subscription')) return true;
  return false;
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 45000 }),
    page.locator('form.neo-auth-form button[type="submit"]').click(),
  ]);
}

async function collectSidebarHrefs(page) {
  return page.$$eval('aside.dashboard-sidebar a[href]', (els) =>
    [...new Set(els.map((a) => a.getAttribute('href')).filter(Boolean))]
  );
}

async function clickSafeButtons(page, roleName, pathLabel) {
  const buttons = page.locator(
    'button:visible, .neo-btn:not(a):visible, [role="button"]:visible'
  );
  const n = await buttons.count();
  const clicked = [];
  const failures = [];
  for (let i = 0; i < n; i++) {
    const btn = buttons.nth(i);
    let text = '';
    try {
      text = (await btn.innerText()).trim();
    } catch {
      continue;
    }
    if (shouldSkipButtonText(text)) continue;
    try {
      await btn.click({ timeout: 3000 });
      clicked.push(text.slice(0, 80));
      await page.waitForTimeout(400);
    } catch (e) {
      failures.push({ text: text.slice(0, 80), error: String(e.message || e) });
    }
  }
  return { clicked, failures };
}

async function crawlRole(browser, role) {
  const consoleMsgs = [];
  const pageErrors = [];
  const failedReq = [];
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleMsgs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    failedReq.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const visited = [];
  const buttonRuns = [];

  try {
    await login(page, role);
    const hrefs = await collectSidebarHrefs(page);
    const dashHrefs = hrefs.filter((h) => h.startsWith('/dashboard'));

    for (const href of dashHrefs) {
      try {
        await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(600);
        const title = await page.title();
        const br = await clickSafeButtons(page, role.name, href);
        buttonRuns.push({ href, clicked: br.clicked.length, failures: br.failures });
        visited.push({ href, title, ok: true });
      } catch (e) {
        visited.push({ href, ok: false, error: String(e.message || e) });
      }
    }
  } catch (e) {
    visited.push({ href: '/login', ok: false, error: String(e.message || e) });
  }

  await page.close();
  return {
    role: role.name,
    visited,
    consoleErrors: consoleMsgs,
    pageErrors,
    failedRequests: failedReq.filter((x) => x.url.includes('/api')),
    buttonRuns,
  };
}

async function main() {
  const { writeFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const outFile = fileURLToPath(new URL('../qa-ui-results.json', import.meta.url));

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const results = [];
  if (!ROLES.length) {
    console.error('No roles match QA_UI_ROLES — check env.');
    process.exit(2);
  }
  for (const r of ROLES) {
    results.push(await crawlRole(browser, r));
  }
  await browser.close();

  await writeFile(outFile, JSON.stringify(results, null, 2));
  console.log('Wrote', outFile);

  let exit = 0;
  for (const x of results) {
    if (x.consoleErrors?.length || x.pageErrors?.length || x.failedRequests?.length || x.visited.some((v) => !v.ok)) {
      exit = 1;
    }
  }
  process.exit(exit);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
