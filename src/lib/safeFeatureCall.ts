import { isFeatureDisabledError } from '@/lib/apiErrorClassifier';

const isDev =
  import.meta.env.DEV ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

/**
 * Runs a feature-gated request. Subscription feature denials ({@link isFeatureDisabledError})
 * resolve to `fallback` so dashboards do not hard-fail; RBAC and other errors rethrow.
 *
 * @param optionalModule - when set, dev logs a clear message when the call degrades to fallback.
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
    throw e;
  }
}
