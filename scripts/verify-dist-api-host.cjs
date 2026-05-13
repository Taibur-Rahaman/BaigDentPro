const fs = require('fs');
const path = require('path');
const { resolveViteApiUrlFromEnvAndFiles } = require('./resolveViteApiUrl.cjs');

const FORBIDDEN_RELATIVE_API_RETURN = /return["']\/api["']/;
const FORBIDDEN_RELATIVE_LOGIN_FETCH = [
  "fetch('/api/auth/login'",
  'fetch("/api/auth/login"',
  'fetch(`/api/auth/login`',
];
// Cannot ban bare `"/api/auth/login"` substring: legitimate full URL literals contain that sequence.
const rootDir = path.join(__dirname, '..');
const cfgUrl = resolveViteApiUrlFromEnvAndFiles(rootDir);
if (!cfgUrl || !/^https?:\/\//i.test(cfgUrl)) {
  console.error('❌ Could not resolve VITE_API_URL from env or .env.production.');
  process.exit(1);
}
const REQUIRED_ORIGIN = new URL(cfgUrl).origin;
const REQUIRED_API_BASE = `${REQUIRED_ORIGIN}/api`;

const assetsDir = path.join(rootDir, 'dist', 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets missing.');
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
let hasRequiredBase = false;

for (const f of jsFiles) {
  const text = fs.readFileSync(path.join(assetsDir, f), 'utf8');

  if (text.includes(REQUIRED_API_BASE)) hasRequiredBase = true;

  for (const sub of FORBIDDEN_RELATIVE_LOGIN_FETCH) {
    if (text.includes(sub)) {
      console.error('❌ Relative login fetch forbidden in', f, sub.slice(0, 24));
      process.exit(1);
    }
  }

  if (text.includes('https://www.baigdentpro.com/api/auth/login')) {
    console.error('❌ www-hosted login API URL forbidden in', f);
    process.exit(1);
  }
  if (text.includes('https://baigdentpro.com/api/auth/login')) {
    console.error('❌ apex-hosted login API URL forbidden in', f);
    process.exit(1);
  }

  if (text.includes('www.baigdentpro.com/api')) {
    console.error('❌ www.baigdentpro.com/api forbidden in', f);
    process.exit(1);
  }

  if (FORBIDDEN_RELATIVE_API_RETURN.test(text)) {
    console.error('❌ Forbidden relative API return in', f);
    process.exit(1);
  }

  if (text.includes('window.location.origin')) {
    console.error('❌ window.location.origin in', f);
    process.exit(1);
  }
}

if (!hasRequiredBase) {
  console.error('❌ dist must embed', REQUIRED_API_BASE);
  process.exit(1);
}

console.log('✅ dist guard OK:', REQUIRED_API_BASE);
