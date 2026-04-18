import type { Response, NextFunction, Request } from 'express';
import type { ZodType } from 'zod';

/** Parse `req.body` with Zod; on success replaces `req.body` with parsed value. */
export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
