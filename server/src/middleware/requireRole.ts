import type { Request, Response, NextFunction } from 'express';

/**
 * Logical role groups (stored `User.role` uses Prisma strings).
 * - `ADMIN` → platform / clinic admins (`SUPER_ADMIN`, `CLINIC_ADMIN`, `CLINIC_OWNER`)
 * - `TENANT` → SaaS catalog-only tenants
 * - `SAAS_TENANT` → roles allowed to use tenant-scoped catalog & orders (scoped by `clinicId`)
 */
export type RoleKeyword = 'ADMIN' | 'TENANT' | 'SAAS_TENANT';

const KEYWORD_MEMBERS: Record<RoleKeyword, readonly string[]> = {
  ADMIN: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'CLINIC_OWNER'],
  TENANT: ['TENANT'],
  SAAS_TENANT: ['TENANT', 'DOCTOR', 'CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN'],
};

function expandRoleArg(arg: RoleKeyword | string): string[] {
  if (arg === 'ADMIN' || arg === 'TENANT' || arg === 'SAAS_TENANT') {
    return [...KEYWORD_MEMBERS[arg]];
  }
  return [arg];
}

function readRole(req: Request): string | undefined {
  const u = (req as Request & { user?: { role?: string } }).user;
  return u?.role;
}

/**
 * Require an authenticated user whose `role` matches one of the allowed entries.
 * Pass keywords `ADMIN`, `TENANT`, or `SAAS_TENANT`, and/or concrete DB role strings (e.g. `SUPER_ADMIN`).
 */
export function requireRole(...allowed: Array<RoleKeyword | string>) {
  const allowedSet = new Set<string>();
  for (const a of allowed) {
    expandRoleArg(a).forEach((r) => allowedSet.add(r));
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const role = readRole(req);
    if (!role) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedSet.has(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
