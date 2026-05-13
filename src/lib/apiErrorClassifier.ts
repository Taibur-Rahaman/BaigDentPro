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

/** Subscription / product feature gate (not RBAC): safe to degrade UI. */
export function isFeatureDisabledError(e: unknown): boolean {
  if (!isApiHttpError(e)) return false;
  const parsed = parseApiErrorJsonBody(e.rawBody);
  if (parsed?.error === 'FEATURE_DISABLED') return true;
  /** Pre–402 productFeatureGate responses (deploy overlap). */
  if (
    e.status === 403 &&
    parsed?.success === false &&
    parsed.feature &&
    typeof parsed.error === 'string' &&
    parsed.error.includes('capability is not enabled')
  ) {
    return true;
  }
  return false;
}

export function classifyApiError(e: unknown): ClassifiedApiFailure {
  if (isFeatureDisabledError(e)) return 'SOFT_FEATURE_DISABLED';
  if (isApiHttpError(e) && e.status === 403) return 'HARD';
  return 'HARD';
}
