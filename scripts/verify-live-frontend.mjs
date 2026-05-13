#!/usr/bin/env node
/**
 * Compare local dist/index.html entry hashes vs live site HTML.
 * Verifies AdminUsersPage lazy chunk returns JS (200 application/javascript), not HTML fallback.
 *
 * Usage:
 *   node scripts/verify-live-frontend.mjs
 *   LIVE_SITE_URL=https://baigdentpro.com node scripts/verify-live-frontend.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distIndex = path.join(root, 'dist', 'index.html');

const LIVE_SITE_URL = (process.env.LIVE_SITE_URL || 'https://baigdentpro.com').replace(/\/$/, '');

function extractMainScript(html) {
  const m = html.match(/src="(\/assets\/index-[^"?]+\.js)/);
  return m ? m[1] : null;
}

function extractMainCss(html) {
  const m = html.match(/href="(\/assets\/index-[^"?]+\.css)/);
  return m ? m[1] : null;
}

function adminUsersChunkPath() {
  const assetsDir = path.join(root, 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) return null;
  const files = fs.readdirSync(assetsDir);
  const chunk = files.find((f) => f.startsWith('AdminUsersPage-') && f.endsWith('.js'));
  return chunk ? `/assets/${chunk}` : null;
}

async function head(url) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  const ct = r.headers.get('content-type') || '';
  return { ok: r.ok, status: r.status, contentType: ct };
}

async function main() {
  if (!fs.existsSync(distIndex)) {
    console.error('❌ dist/index.html missing — run: npm run build');
    process.exit(2);
  }

  const localHtml = fs.readFileSync(distIndex, 'utf8');
  const localMain = extractMainScript(localHtml);
  const localCss = extractMainCss(localHtml);
  const chunkPath = adminUsersChunkPath();

  console.log('Local dist/index.html');
  console.log('  main:', localMain || '(parse failed)');
  console.log('  css: ', localCss || '(parse failed)');
  console.log('  AdminUsersPage chunk:', chunkPath || '(not found)');

  let liveHtml;
  try {
    const r = await fetch(`${LIVE_SITE_URL}/`, { redirect: 'follow' });
    liveHtml = await r.text();
  } catch (e) {
    console.error('❌ Failed to fetch live site:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const liveMain = extractMainScript(liveHtml);
  const liveCss = extractMainCss(liveHtml);

  console.log('\nLive', LIVE_SITE_URL);
  console.log('  main:', liveMain || '(parse failed)');
  console.log('  css: ', liveCss || '(parse failed)');

  const match = Boolean(localMain && liveMain && localMain === liveMain);
  console.log('\nEntry hash match:', match ? '✅ YES' : '⚠️ NO — deploy latest dist/ to FRONTEND_WEB_ROOT');

  let chunkOk = true;
  if (!chunkPath) {
    chunkOk = true;
    console.log('\nLazy chunk verification: skipped (no AdminUsersPage-* chunk in local dist)');
  } else {
    const chunkUrl = `${LIVE_SITE_URL}${chunkPath}`;
    const h = await head(chunkUrl);
    const looksLikeJs =
      h.ok && (h.contentType.includes('javascript') || h.contentType.includes('ecmascript'));
    console.log('\nLazy chunk HEAD', chunkUrl);
    console.log('  status:', h.status, 'content-type:', h.contentType || '(none)');
    if (!looksLikeJs) {
      console.log('  ❌ Chunk validation FAIL — expected application/javascript (got HTML SPA fallback?)');
      console.log('      Fix: set FRONTEND_WEB_ROOT to LiteSpeed docroot; full rsync deploy with --delete');
      chunkOk = false;
    } else {
      console.log('  ✅ Chunk validation PASS');
    }
  }

  const ok = match && chunkOk;
  process.exit(ok ? 0 : 3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
