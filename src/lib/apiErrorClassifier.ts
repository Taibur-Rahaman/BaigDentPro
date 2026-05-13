import { isApiHttpError } from '@/lib/apiErrors';

export type ClassifiedApiFailure = 'SOFT_FEATURE_DISABLED' | 'HARD';

/** Parsed JSON body from a failed API response (best-effort). */
export function parseApiErrorJsonBody(rawBody: string): {
  error?: string;
  feature?: string;
  success?: boolean;
} | null {
  try {
    const o = JSON.parse(rawBody) as Record<string, unknown>;
    if (!o || typeof o !== 'object') return null;
    return {
      error: typeof o.error === 'string' ? o.error : undefined,
      feature: typeof o.feature === 'string' ? o.feature : undefined,
      success: typeof o.success === 'boolean' ? o.success : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Product / subscription feature denial (never RBAC).
 *
 * Rules (strict):
 * - HTTP **402** → treat as feature gate (server uses this for `productFeatureGate` denials).
 * - Body `error === "FEATURE_DISABLED"` on any status **except 403** → soft feature denial.
 * - HTTP **403** is **never** interpreted as feature-disabled — RBAC / session / tenancy only → hard.
 */
export function isFeatureDisabledError(e: unknown): boolean {
  if (!isApiHttpError(e)) return false;
  if (e.status === 403) return false;
  if (e.status === 402) return true;
  const parsed = parseApiErrorJsonBody(e.rawBody);
  return parsed?.error === 'FEATURE_DISABLED';
}

export function classifyApiError(e: unknown): ClassifiedApiFailure {
  if (isFeatureDisabledError(e)) return 'SOFT_FEATURE_DISABLED';
  if (isApiHttpError(e) && e.status === 403) return 'HARD';
  return 'HARD';
}
