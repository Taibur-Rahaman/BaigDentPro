#!/usr/bin/env bash
# Ensures workspace routing modules imported by the client are always committed.
# Prevents `git clean -fd` (or shallow clones) from removing runtime-required sources.
# Add new paths here when PracticeWorkspacePage / shells gain hard dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."

REQUIRED=(
  "src/config/workspaceResolver.ts"
  "src/layouts/workspaces/index.ts"
  "src/layouts/workspaces/StarterWorkspaceShell.tsx"
  "src/layouts/workspaces/ClinicWorkspaceShell.tsx"
  "src/layouts/workspaces/EnterpriseWorkspaceShell.tsx"
)

missing=0
for path in "${REQUIRED[@]}"; do
  listed="$(git ls-files -- "$path" || true)"
  if [[ -z "$listed" ]]; then
    echo "ERROR: Required path is not tracked in git: $path" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo "verify-required-paths-tracked: fix by committing these modules (do not rely on untracked copies)." >&2
  exit 1
fi

echo "verify-required-paths-tracked: OK (${#REQUIRED[@]} paths)"
