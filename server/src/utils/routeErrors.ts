import type { RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth.js';
import { sendSafeError } from './safeError.js';
import { isDatabaseUnreachableError, sendDatabaseUnavailable } from './dbUnavailable.js';
import { isHttpError } from './httpError.js';

/** Maps Prisma and infra errors to HTTP responses without leaking internals in production. */
export function handleRouteError(res: Response, err: unknown, logContext: string): void {
  if (isDatabaseUnreachableError(err)) {
    sendDatabaseUnavailable(res);
    return;
  }
  if (isHttpError(err)) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({ success: false, error: 'A record with this value already exists' });
        return;
      case 'P2003':
        res.status(400).json({ success: false, error: 'Invalid reference' });
        return;
      case 'P2025':
        res.status(404).json({ success: false, error: 'Record not found' });
        return;
      default:
        sendSafeError(res, 500, err, logContext);
        return;
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ success: false, error: 'Invalid request data' });
    return;
  }
  if (
    process.env.DEBUG_AUTH_ERRORS === '1' &&
    process.env.NODE_ENV !== 'production' &&
    (logContext.includes('auth.login') || logContext.includes('auth/login'))
  ) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DEBUG_AUTH_ERRORS]', logContext, err);
    res.status(500).json({ error: message, code: 'AUTH_INTERNAL_ERROR', context: logContext });
    return;
  }
  sendSafeError(res, 500, err, logContext);
}

export function asyncRoute(
  label: string,
  handler: (req: AuthRequest, res: Response) => Promise<void>
): RequestHandler {
  return async (req, res, _next) => {
    try {
      await handler(req as AuthRequest, res);
    } catch (err) {
      handleRouteError(res, err, label);
    }
  };
}
