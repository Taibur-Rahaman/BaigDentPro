import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';

type ReqLike = Pick<Request, 'ip'> & { get?: (name: string) => string | undefined };

/**
 * Best-effort clinic-scoped timeline row. Never throws to callers.
 * Prefer this over raw `prisma.activityLog.create` for SaaS audit trails.
 */
export async function logActivity(input: {
  userId: string;
  clinicId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue | null;
  req?: ReqLike;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId,
        clinicId: input.clinicId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta:
          input.meta === undefined
            ? undefined
            : input.meta === null
              ? Prisma.JsonNull
              : input.meta,
        ipAddress: input.req?.ip ?? undefined,
        userAgent: input.req?.get?.('user-agent') ?? undefined,
      },
    });
  } catch (err) {
    console.error('[logActivity]', input.action, err instanceof Error ? err.message : err);
  }
}
