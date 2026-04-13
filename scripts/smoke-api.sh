#!/usr/bin/env bash
# Call GET /api/health on a running BaigDentPro server. Fails if not JSON with "database".
# Usage: ./scripts/smoke-api.sh [BASE_URL]
# Example: ./scripts/smoke-api.sh http://127.0.0.1:3001
set -euo pipefail
BASE="${1:-http://127.0.0.1:3001}"
BASE="${BASE%/}"
echo "GET $BASE/api/health"
if ! json="$(curl -fsS --max-time 15 "$BASE/api/health")"; then
  echo "FAIL: request failed (is the server running?)"
  exit 1
fi
echo "$json"
if echo "$json" | grep -q '"database"'; then
  echo "OK: health JSON"
  exit 0
fi
echo "FAIL: expected JSON with database field (got HTML or wrong service?)"
exit 1
