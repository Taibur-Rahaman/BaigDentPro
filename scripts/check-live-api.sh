#!/usr/bin/env bash
# Quick check: does the URL return JSON health (API) or HTML (SPA / wrong path)?
# Usage: ./scripts/check-live-api.sh 'https://yourdomain.com/api/health'
set -euo pipefail
URL="${1:-https://baigdentpro.com/api/health}"
echo "GET $URL"
tmp="$(mktemp)"
code="$(curl -sS -o "$tmp" -w "%{http_code}" --max-time 20 "$URL" || true)"
echo "HTTP status: $code"
head -c 300 "$tmp"
echo
if grep -q '"database"' "$tmp" 2>/dev/null; then
  echo "OK: JSON health response (looks like the real API)."
elif grep -qi '<!doctype html' "$tmp" 2>/dev/null; then
  echo "WARN: Got HTML — usually static hosting or SPA fallback. Set VITE_API_URL to your Node API, or proxy /api to the backend."
else
  echo "WARN: Unexpected body; confirm the API base URL."
fi
rm -f "$tmp"
