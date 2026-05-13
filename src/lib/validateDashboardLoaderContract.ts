import { CORE_MODULES, OPTIONAL_MODULES } from '@/lib/dashboardLoaderConstants';

const isDev =
  import.meta.env.DEV ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

/** Shape passed from {@link loadPracticeLists} construction (dev-only checks). */
export type DashboardLoaderContractSnapshot = {
  coreKeys: readonly string[];
  optionalKeys: readonly string[];
  /** True when each core factory is a direct API call (not safeFeatureCall). Checked via Symbol. */
  coreFactories: ReadonlyMap<string, unknown>;
  optionalFactories: ReadonlyMap<string, unknown>;
};

/** Tag placed on optional runners produced only by {@link registerOptionalFetch}. */
export const OPTIONAL_SAFE_TAG = Symbol.for('baigdentpro.dashboard.optionalSafeFeatureCall');

export function markOptionalSafeRunner<T extends () => Promise<unknown>>(fn: T): T {
  (fn as unknown as { [OPTIONAL_SAFE_TAG]?: true })[OPTIONAL_SAFE_TAG] = true;
  return fn;
}

export function isOptionalSafeRunner(fn: unknown): boolean {
  if (!fn || typeof fn !== 'function') return false;
  if (!(OPTIONAL_SAFE_TAG in fn)) return false;
  return (fn as Record<symbol, unknown>)[OPTIONAL_SAFE_TAG] === true;
}

/**
 * Throws in development if the practice list loader wiring violates core vs optional rules.
 */
export function validateDashboardLoaderContract(snapshot: DashboardLoaderContractSnapshot): void {
  if (!isDev) return;

  const coreSorted = [...snapshot.coreKeys].sort().join(',');
  const expectedCore = [...CORE_MODULES].sort().join(',');
  if (coreSorted !== expectedCore) {
    throw new Error(
      `[dashboardLoader] CORE_MODULES mismatch: expected [${expectedCore}], got [${coreSorted}]`,
    );
  }

  const optSorted = [...snapshot.optionalKeys].sort().join(',');
  const expectedOpt = [...OPTIONAL_MODULES].sort().join(',');
  if (optSorted !== expectedOpt) {
    throw new Error(
      `[dashboardLoader] OPTIONAL_MODULES mismatch: expected [${expectedOpt}], got [${optSorted}]`,
    );
  }

  for (const name of CORE_MODULES) {
    const fn = snapshot.coreFactories.get(name);
    if (!fn) throw new Error(`[dashboardLoader] Missing core factory: ${name}`);
    if (isOptionalSafeRunner(fn)) {
      throw new Error(`[dashboardLoader] Core module "${name}" must NOT use optional/safeFeatureCall wrapper`);
    }
  }

  for (const name of OPTIONAL_MODULES) {
    const fn = snapshot.optionalFactories.get(name);
    if (!fn) throw new Error(`[dashboardLoader] Missing optional factory: ${name}`);
    if (!isOptionalSafeRunner(fn)) {
      throw new Error(
        `[dashboardLoader] Optional module "${name}" MUST be registered with registerOptionalFetch (safeFeatureCall)`,
      );
    }
  }
}
