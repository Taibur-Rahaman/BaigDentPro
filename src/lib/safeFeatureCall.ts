import { isApiHttpError } from '@/lib/apiErrors';
import { isFeatureDisabledError } from '@/lib/apiErrorClassifier';

const isDev =
  import.meta.env.DEV ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

/**
 * Runs a feature-gated request.
 *
 * When `optionalModule` is set (dashboard **invoices** / **lab** list lanes only), **any** failure
 * resolves to `fallback` so one broken transport, RBAC denial, or parse error cannot reject the
 * practice bundle loader (which would blank the whole workspace / trip higher-level error UX).
 *
 * Callers that need strict semantics must omit `optionalModule` (then only {@link isFeatureDisabledError}
 * soft-fails; everything else rethrows).
 */
export async function safeFeatureCall<T>(
  request: () => Promise<T>,
  fallback: T,
  optionalModule?: string,
): Promise<T> {
  try {
    return await request();
  } catch (e: unknown) {
    if (isFeatureDisabledError(e)) {
      if (isDev && optionalModule) {
        console.warn(`[DASHBOARD] Optional module failed safely: ${optionalModule} (feature gated)`, e);
      }
      return fallback;
    }
    if (optionalModule) {
      if (isDev) {
        const hint = isApiHttpError(e) ? `HTTP ${e.status}` : 'non-HTTP';
        console.warn(`[DASHBOARD] Optional "${optionalModule}" degraded to empty (${hint})`, e);
      }
      return fallback;
    }
    throw e;
  }
}
