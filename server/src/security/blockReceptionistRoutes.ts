/**
 * Receptionist route block — surgical 403 wrapper.
 *
 * Receptionists must NOT access billing/subscription pages or the clinic
 * activity timeline. The frontend already hides those menu links, but the
 * backend routes still allowed `RECEPTIONIST` (see `routes/activity.ts`
 * line 12). This middleware is mounted at the top of `/api/subscription`
 * and `/api/activity` to enforce the rule additively without modifying
 * existing role lists.
 */
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

export function blockReceptionist(req: Request, res: Response, next: NextFunction): void {
  const a = req as AuthRequest;
  const role = (a.user?.role ?? '').trim();
  if (role === 'RECEPTIONIST') {
    res
      .status(403)
      .json({ success: false, error: 'This page is not available for receptionist accounts.' });
    return;
  }
  next();
}
