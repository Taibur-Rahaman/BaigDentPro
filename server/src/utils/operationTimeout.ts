const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class OperationTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'OperationTimeoutError';
  }
}

/** Bounds hung Prisma / network work so login cannot stall the browser for minutes. */
export async function withOperationTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new OperationTimeoutError(label, ms)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export { sleep };
