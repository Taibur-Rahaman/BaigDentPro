/**
 * Compatibility barrel — implementations live under `./core/` (`coreHttpClient`, domain APIs, auth storage).
 * Policy: prefer new transport/auth-orchestration exports only; do not grow token/storage
 * surface here without review (see `.cursor/rules/frontend-architecture.mcp.txt`).
 */

/** Full core surface for façades (`src/api.ts`) — wired through `coreApiClient` to satisfy CI import graph. */
export * from '@/lib/coreApiClient';
