#!/usr/bin/env bash
# Repo safety + optional live health check. Run from repo root: npm run ops:verify
# Optional: HEALTH_URL=https://api.yourdomain.com npm run ops-verify
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Git: no committed env files (excluding *.example) =="
bad="$(git ls-files | grep -E '\.env' | grep -v '\.example' || true)"
if [[ -n "$bad" ]]; then
  echo "FAIL — tracked files that look like env secrets:"
  echo "$bad"
  exit 1
fi
echo "OK"

if [[ -n "${HEALTH_URL:-}" ]]; then
  base="${HEALTH_URL%/}"
  echo ""
  echo "== Live health: $base/api/health =="
  bash "$ROOT/scripts/check-live-api.sh" "${base}/api/health"
fi

echo ""
echo "All automated checks passed. Next: follow OPERATIONS_RUNBOOK.md on your servers."
