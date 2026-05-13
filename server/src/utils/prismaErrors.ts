export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

/**
 * True when runtime code references DB objects that are missing in current schema.
 * Most often caused by skipped production migrations (P2021/P2022).
 */
export function isPrismaSchemaDriftError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code !== undefined &&
    ['P2021', 'P2022'].includes((error as { code?: string }).code as string)
  );
}
