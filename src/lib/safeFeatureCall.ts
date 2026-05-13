import { isFeatureDisabledError } from '@/lib/apiErrorClassifier';

/**
 * Runs a feature-gated request. Subscription feature denials ({@link isFeatureDisabledError})
 * resolve to `fallback` so dashboards do not hard-fail; RBAC and other errors rethrow.
 */
export async function safeFeatureCall<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (e: unknown) {
    if (isFeatureDisabledError(e)) return fallback;
    throw e;
  }
}
