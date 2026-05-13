#!/usr/bin/env bash
#
# Run ON THE VPS after SSH (not from laptop). Finds where LiteSpeed serves the SPA bundle from.
#
# Replace OLD_HASH if you still see stale assets in browser Network tab:
#   OLD_HASH=XclscX8q
#
OLD_HASH="${OLD_HASH:-XclscX8q}"

echo "==> Searching for live main bundle assets/index-${OLD_HASH}.js ..."
find ~ /var/www /home /usr/local/lsws 2>/dev/null \
  -type f -path "*/assets/index-${OLD_HASH}.js"

echo ""
echo "The directory CONTAINING \"assets/\" is FRONTEND_WEB_ROOT."
echo "Example: .../public_html/assets/index-${OLD_HASH}.js  →  FRONTEND_WEB_ROOT=.../public_html"
