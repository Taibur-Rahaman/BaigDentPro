/** EMR lists that must fail the dashboard load if they fail (never soft-wrapped). */
export const CORE_MODULES = ['patients', 'appointments', 'prescriptions'] as const;
export type CoreModuleName = (typeof CORE_MODULES)[number];

/** Plan / feature–gated lists; must use {@link safeFeatureCall} via registry only. */
export const OPTIONAL_MODULES = ['invoices', 'lab'] as const;
export type OptionalModuleName = (typeof OPTIONAL_MODULES)[number];
