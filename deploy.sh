#!/usr/bin/env bash
#
# BaigDentPro — production deploy (Hostinger VPS style)
# - Installs deps, applies Prisma migrations (deploy), builds SPA + API, reloads PM2, validates NGINX.
#
# Prerequisites on the server:
#   Node ≥20, npm, git, PM2 (`npm i -g pm2`), nginx, PostgreSQL reachable via DATABASE_URL
#   Copy deploy/production.env.example → server/.env and root .env.production (see docs)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Environment overrides:
#   GIT_REMOTE=origin GIT_BRANCH=main ./deploy.sh
#   SKIP_GIT=1 ./deploy.sh          # skip pull (build only)
#   SKIP_NGINX=1 ./deploy.sh        # skip nginx -t / reload
#   FRONTEND_WEB_ROOT (REQUIRED unless ALLOW_LEGACY_DEFAULT_WEBROOT=1)
#     Discover on VPS: scripts/find-live-frontend-root.example.sh (run after SSH)
#     Example: FRONTEND_WEB_ROOT=/home/USER/domains/baigdentpro.com/public_html
#   BACKUP_FRONTEND=1 ./deploy.sh   # tar.gz backup of current web root before rsync (server-side)
#
# Rollback (manual — safer than automatic git resets):
#   git log --oneline -5
#   git checkout <previous_sha>
#   SKIP_GIT=1 ./deploy.sh
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SKIP_GIT="${SKIP_GIT:-0}"
SKIP_NGINX="${SKIP_NGINX:-0}"
FRONTEND_WEB_ROOT="${FRONTEND_WEB_ROOT:-}"

mkdir -p "${ROOT}/logs"

# Prevent silent deploys to the wrong LiteSpeed/hPanel docroot (stale hashed chunks + SPA HTML for *.js).
if [[ -z "${FRONTEND_WEB_ROOT}" ]]; then
  if [[ "${ALLOW_LEGACY_DEFAULT_WEBROOT:-0}" == "1" ]]; then
    FRONTEND_WEB_ROOT="/var/www/dpms/dist"
    echo "WARN: Using legacy default FRONTEND_WEB_ROOT=${FRONTEND_WEB_ROOT} (ALLOW_LEGACY_DEFAULT_WEBROOT=1)"
  else
    cat <<'EOM' >&2

ERROR: FRONTEND_WEB_ROOT is not set — refusing to rsync (avoids wrong LiteSpeed document root).

On the VPS (SSH), discover the real root:
  OLD_HASH=XclscX8q bash scripts/find-live-frontend-root.example.sh
  # or manually:
  find ~ /var/www /home /usr/local/lsws -type f -path '*/assets/index-XclscX8q.js' 2>/dev/null

Then deploy from the repo on the server:
  export FRONTEND_WEB_ROOT='/path/above/assets'   # e.g. .../domains/baigdentpro.com/public_html
  BACKUP_FRONTEND=1 ./deploy.sh

Only if you intentionally use the old /var/www/dpms/dist path:
  ALLOW_LEGACY_DEFAULT_WEBROOT=1 ./deploy.sh

EOM
    exit 1
  fi
fi

echo "==> FRONTEND_WEB_ROOT=${FRONTEND_WEB_ROOT}"


echo "==> BaigDentPro deploy — root: ${ROOT}"

if [[ "${SKIP_GIT}" != "1" ]]; then
  if [[ ! -d "${ROOT}/.git" ]]; then
    echo "WARN: No .git directory — skipping git pull (set SKIP_GIT=1 to silence)."
  else
    echo "==> git fetch + pull (${GIT_REMOTE} ${GIT_BRANCH})"
    git fetch "${GIT_REMOTE}" "${GIT_BRANCH}"
    git pull --ff-only "${GIT_REMOTE}" "${GIT_BRANCH}"
  fi
else
  echo "==> SKIP_GIT=1 — leaving working tree as-is"
fi

echo "==> npm ci (root workspace + server)"
npm ci

echo "==> Prisma: generate + migrate deploy (production-safe)"
(
  cd "${ROOT}/server"
  npx prisma generate
  npx prisma migrate deploy
)

echo "==> Build frontend + backend"
npm run build:production

echo "==> Sync frontend dist to web root (${FRONTEND_WEB_ROOT})"
if [[ -d "${ROOT}/dist" ]]; then
  sudo mkdir -p "${FRONTEND_WEB_ROOT}"
  if [[ "${BACKUP_FRONTEND:-0}" == "1" ]]; then
    BK="${ROOT}/logs/live-webroot-$(date +%Y%m%d-%H%M%S).tar.gz"
    echo "    BACKUP_FRONTEND=1 — archiving current web root → ${BK}"
    sudo tar czf "${BK}" -C "$(dirname "${FRONTEND_WEB_ROOT}")" "$(basename "${FRONTEND_WEB_ROOT}")" 2>/dev/null || echo "    WARN: backup skipped (permissions/path)."
  fi
  # --delete removes orphan hashed chunks/CSS so old and new assets never mix.
  if command -v rsync >/dev/null 2>&1; then
    sudo rsync -a --delete "${ROOT}/dist/" "${FRONTEND_WEB_ROOT}/"
  else
    sudo rm -rf "${FRONTEND_WEB_ROOT}"/*
    sudo cp -R "${ROOT}/dist/." "${FRONTEND_WEB_ROOT}/"
  fi
else
  echo "ERROR: frontend dist folder missing at ${ROOT}/dist"
  exit 1
fi

echo "==> PM2 reload / start API"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe baigdentpro-api >/dev/null 2>&1; then
    echo "    reloading baigdentpro-api (graceful cluster fork reload)"
    pm2 reload ecosystem.config.cjs --only baigdentpro-api --env production --update-env
  else
    echo "    starting baigdentpro-api"
    pm2 start ecosystem.config.cjs --only baigdentpro-api --env production
  fi
  pm2 save
else
  echo "ERROR: pm2 not found. Install: npm i -g pm2"
  exit 1
fi

if [[ "${SKIP_NGINX}" != "1" ]] && command -v nginx >/dev/null 2>&1; then
  echo "==> nginx config test + reload"
  if sudo -n nginx -t 2>/dev/null; then
    sudo -n systemctl reload nginx || sudo -n service nginx reload || true
  else
    echo "WARN: nginx test/reload skipped (configure sudo or run SKIP_NGINX=1)."
  fi
else
  echo "==> SKIP_NGINX or nginx not installed — reload nginx manually after verification."
fi

echo ""
echo "✅ Deploy finished."
echo "   pm2 logs baigdentpro-api --lines 80"
echo "   curl -fsS http://127.0.0.1:5000/api/health"
