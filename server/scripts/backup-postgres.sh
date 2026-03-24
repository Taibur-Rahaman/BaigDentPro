#!/usr/bin/env bash

set -euo pipefail

# Simple Postgres backup script for BaigDentPro
# - Creates a timestamped dump file
# - Reads connection info from DATABASE_URL
# - Intended to be run via cron or your hosting provider's scheduler
#
# IMPORTANT:
# - Store backups on an external, access-controlled storage bucket (e.g. S3/GCS)
# - Never keep the only copy of backups on the same machine as the database

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Aborting backup." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
FILENAME="baigdentpro-${TIMESTAMP}.sql"
FULL_PATH="${BACKUP_DIR}/${FILENAME}"

echo "Creating Postgres backup at: ${FULL_PATH}"

pg_dump "$DATABASE_URL" --no-owner --no-privileges > "${FULL_PATH}"

echo "Backup completed successfully."
echo "Next step: sync ${FULL_PATH} to secure off-site storage (e.g. AWS S3)."

