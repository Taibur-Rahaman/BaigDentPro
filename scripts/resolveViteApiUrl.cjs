/**
 * Shared resolution for VITE_API_URL used by `check-env.js` and `vite.config.mts`
 * so `vite build` cannot bypass the guard when invoked without `npm run build`.
 */
const fs = require('fs');
const path = require('path');

function readViteApiUrlFromFile(root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const m = s.match(/^VITE_API_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v.trim() || null;
  }
  return null;
}

function resolveViteApiUrlFromEnvAndFiles(rootDir) {
  const fromShell = process.env.VITE_API_URL?.trim();
  const fromLocalFile = readViteApiUrlFromFile(rootDir, '.env.production.local');
  const fromProdFile = readViteApiUrlFromFile(rootDir, '.env.production');
  return fromShell || fromLocalFile || fromProdFile || null;
}

function assertHttpUrl(label, value) {
  if (!/^https?:\/\//i.test(value)) {
    console.error(`❌ ${label} must be an absolute http(s) URL, got:`, value);
    process.exit(1);
  }
}

/** Called from `scripts/check-env.js` before `vite build` (default production). */
function assertViteApiUrlForProductionFrontendBuild() {
  const rootDir = path.join(__dirname, '..');
  const viteApiUrl = resolveViteApiUrlFromEnvAndFiles(rootDir);
  if (!viteApiUrl) {
    console.error('❌ VITE_API_URL is required for production frontend builds.');
    console.error('   Static hosts serve /api/* as SPA HTML unless you proxy to Node.');
    console.error('   Set VITE_API_URL in CI/Hostinger env or in .env.production, then rebuild.');
    console.error('   Example: VITE_API_URL=https://api.baigdentpro.com');
    process.exit(1);
  }
  assertHttpUrl('VITE_API_URL', viteApiUrl);
  console.log('✅ VITE_API_URL:', viteApiUrl);
}

/**
 * Used from Vite plugin when `vite build` runs with mode `production` only.
 * Throws instead of process.exit so Vite can report the error.
 */
function getResolvedViteApiUrlForProductionBuildOrThrow(rootDir) {
  const viteApiUrl = resolveViteApiUrlFromEnvAndFiles(rootDir);
  if (!viteApiUrl) {
    throw new Error(
      '[BaigDentPro] VITE_API_URL is required for vite build (mode production). ' +
        'Set it in the environment or .env.production / .env.production.local.'
    );
  }
  if (!/^https?:\/\//i.test(viteApiUrl)) {
    throw new Error(`[BaigDentPro] VITE_API_URL must start with http:// or https://, got: ${viteApiUrl}`);
  }
  return viteApiUrl;
}

module.exports = {
  assertViteApiUrlForProductionFrontendBuild,
  getResolvedViteApiUrlForProductionBuildOrThrow,
};
