import type { CoreModuleName, OptionalModuleName } from '@/lib/dashboardLoaderConstants';
import { CORE_MODULES, OPTIONAL_MODULES } from '@/lib/dashboardLoaderConstants';
import { safeFeatureCall } from '@/lib/safeFeatureCall';
import { markOptionalSafeRunner } from '@/lib/validateDashboardLoaderContract';

type CoreFns = Map<CoreModuleName, () => Promise<unknown>>;
type OptionalFns = Map<OptionalModuleName, () => Promise<unknown>>;

export type PracticeListRegistry = {
  registerCoreFetch: (name: CoreModuleName, fn: () => Promise<unknown>) => void;
  registerOptionalFetch: <T>(name: OptionalModuleName, fn: () => Promise<T>, fallback: T) => void;
  /** Dev contract validation + typed maps for {@link dashboardEntityListPromiseAll}. */
  getMaps: () => { core: CoreFns; optional: OptionalFns };
};

/**
 * Per–load registry: core fetches are never wrapped; optional fetches always go through
 * {@link safeFeatureCall} (tagged for {@link validateDashboardLoaderContract}).
 */
export function createPracticeListRegistry(): PracticeListRegistry {
  const core: CoreFns = new Map();
  const optional: OptionalFns = new Map();

  return {
    registerCoreFetch(name, fn) {
      if ((OPTIONAL_MODULES as readonly string[]).includes(name)) {
        throw new Error(`[dashboardFetchRegistry] "${name}" is optional — use registerOptionalFetch`);
      }
      core.set(name, fn);
    },
    registerOptionalFetch(name, fn, fallback) {
      if ((CORE_MODULES as readonly string[]).includes(name)) {
        throw new Error(`[dashboardFetchRegistry] "${name}" is core — use registerCoreFetch`);
      }
      const wrapped = markOptionalSafeRunner(async () => safeFeatureCall(fn, fallback, name));
      optional.set(name, wrapped as () => Promise<unknown>);
    },
    getMaps() {
      return { core, optional };
    },
  };
}

export { CORE_MODULES, OPTIONAL_MODULES };
