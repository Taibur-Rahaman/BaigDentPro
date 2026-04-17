import type { Response } from 'express';

const isProd = () => process.env.NODE_ENV === 'production';

/** Avoid leaking DB/internal details to clients in production. */
export function sendSafeError(res: Response, status: number, err: unknown, logContext?: string): void {
  const message = err instanceof Error ? err.message : String(err);
  if (logContext) {
    console.error(`[${logContext}]`, message);
  } else {
    console.error(message);
  }
  if (isProd()) {
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong' : 'Request could not be completed',
    });
  } else {
    res.status(status).json({ error: message });
  }
}
