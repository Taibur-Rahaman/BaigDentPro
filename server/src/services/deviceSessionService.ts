import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { prisma } from '../index.js';
import type { SubscriptionWithPlan } from './planCatalog.js';
import { resolveDeviceLimit } from './planCatalog.js';

export function computeLoginDeviceId(req: Request): string {
  const ua = req.get('user-agent') || '';
  const ip = req.ip || req.socket?.remoteAddress || '';
  return createHash('sha256').update(`${ua}|${ip}`, 'utf8').digest('hex');
}

/**
 * Enforces per-clinic distinct device cap from the active billing plan.
 * Returns false when a *new* device would exceed the limit (existing device always allowed).
 */
export async function assertDeviceCapacityForLogin(params: {
  clinicId: string;
  userId: string;
  deviceId: string;
  subscription: SubscriptionWithPlan | null;
  skipLimit: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (params.skipLimit) {
    return { ok: true };
  }

  const limit = await resolveDeviceLimit(params.subscription);
  const existingForUser = await prisma.deviceSession.findUnique({
    where: {
      userId_clinicId_deviceId: {
        userId: params.userId,
        clinicId: params.clinicId,
        deviceId: params.deviceId,
      },
    },
    select: { id: true },
  });
  if (existingForUser) {
    return { ok: true };
  }

  const distinct = await prisma.deviceSession.findMany({
    where: { clinicId: params.clinicId },
    distinct: ['deviceId'],
    select: { deviceId: true },
  });
  const alreadySeenDevice = distinct.some((d) => d.deviceId === params.deviceId);
  if (alreadySeenDevice) {
    return { ok: true };
  }

  if (distinct.length >= limit) {
    return {
      ok: false,
      message: `This clinic has reached its device limit (${limit}) for the current subscription. Ask your administrator to upgrade the plan or remove an unused device session.`,
    };
  }

  return { ok: true };
}

export async function recordDeviceSession(userId: string, clinicId: string, deviceId: string): Promise<void> {
  await prisma.deviceSession.upsert({
    where: {
      userId_clinicId_deviceId: { userId, clinicId, deviceId },
    },
    create: { userId, clinicId, deviceId },
    update: {},
  });
}
