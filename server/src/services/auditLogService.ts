import { Prisma } from '@prisma/client';
import { prismaBase } from '../db/prisma.js';

export type AuditMetadata = Prisma.InputJsonValue | null;

/** Best-effort audit write; never throws to callers. */
export async function writeAuditLog(input: {
  userId: string;
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  clinicId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeSnapshot?: Prisma.InputJsonValue | null;
  afterSnapshot?: Prisma.InputJsonValue | null;
  metadata?: AuditMetadata;
}): Promise<void> {
  try {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      userId: input.userId,
      action: input.action,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      clinicId: input.clinicId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };
    if (input.beforeSnapshot !== undefined) {
      data.beforeSnapshot =
        input.beforeSnapshot === null ? Prisma.JsonNull : (input.beforeSnapshot as Prisma.InputJsonValue);
    }
    if (input.afterSnapshot !== undefined) {
      data.afterSnapshot =
        input.afterSnapshot === null ? Prisma.JsonNull : (input.afterSnapshot as Prisma.InputJsonValue);
    }
    if (input.metadata !== undefined) {
      data.metadata =
        input.metadata === null ? Prisma.JsonNull : (input.metadata as Prisma.InputJsonValue);
    }
    await prismaBase.auditLog.create({ data });
  } catch (err) {
    console.error('[auditLog]', input.action, err instanceof Error ? err.message : err);
  }
}
