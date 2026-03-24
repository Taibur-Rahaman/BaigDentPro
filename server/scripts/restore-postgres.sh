#!/usr/bin/env bash

set -euo pipefail

# Simple Postgres restore script for BaigDentPro
# Usage:
#   DATABASE_URL="postgresql://user:password@host:5432/baigdentpro?sslmode=require" \
#   ./scripts/restore-postgres.sh path/to/backup.sql
#
# WARNING:
# - This will DROP all existing tables in the target database before restore.
# - Only run this against a database you intend to fully overwrite (e.g. after an incident or in a test environment).

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Aborting restore." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/backup.sql" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

echo "About to restore database from backup file: ${BACKUP_FILE}"
read -r -p "This will DROP existing data in the target database. Continue? [y/N] " CONFIRM

if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Dropping existing schema objects..."
psql "$DATABASE_URL" <<'SQL'
DO
$$
DECLARE
    r RECORD;
BEGIN
    -- Drop all foreign key constraints
    FOR r IN (SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;

    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END
$$;
SQL

echo "Restoring from backup..."
psql "$DATABASE_URL" < "${BACKUP_FILE}"

echo "Restore completed successfully."

