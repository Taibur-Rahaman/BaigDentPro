import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireActiveSubscription } from '../middleware/clinicSubscription.js';
import { requireSaaSClinicScopeAlignment } from '../middleware/tenantClinicGuard.js';
import { requirePlanFeature } from '../middleware/requirePlanFeature.js';
import { validateBody } from '../middleware/validateBody.js';
import { branchCreateBodySchema, branchUpdateBodySchema } from '../validation/schemas.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { effectivePlanName, mergePlanFeatures, resolveDeviceLimit, type SubscriptionWithPlan } from '../services/planCatalog.js';

const router = Router();

function scopeClinicId(req: AuthRequest): string | null {
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user?.clinicId ?? null;
}

function assertClinicScope(req: AuthRequest, clinicId: string): boolean {
  if (req.user!.role === 'SUPER_ADMIN') return true;
  return req.user!.clinicId === clinicId;
}

router.get(
  '/branches',
  asyncRoute('clinic.branches.list', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId) {
      res.status(403).json({ error: 'No clinic context' });
      return;
    }
    if (!assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const branches = await prisma.branch.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    });
    res.json({ branches });
  })
);

router.post(
  '/branches',
  requireRole('ADMIN'),
  requireActiveSubscription,
  requireSaaSClinicScopeAlignment,
  requirePlanFeature('branches'),
  validateBody(branchCreateBodySchema),
  asyncRoute('clinic.branches.create', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId) {
      res.status(403).json({ error: 'No clinic context' });
      return;
    }
    const { name, address } = req.body as { name: string; address?: string | null };
    const branch = await prisma.branch.create({
      data: { clinicId, name: name.trim(), address: address?.trim() || null },
    });
    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          clinicId,
          action: 'CLINIC_CREATE_BRANCH',
          entity: 'BRANCH',
          entityId: branch.id,
          details: JSON.stringify({ name: branch.name, clinicId }),
        },
      })
      .catch(() => {});
    res.status(201).json({ branch });
  })
);

router.put(
  '/branches/:id',
  requireRole('ADMIN'),
  requireActiveSubscription,
  requireSaaSClinicScopeAlignment,
  validateBody(branchUpdateBodySchema),
  asyncRoute('clinic.branches.update', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId || !assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { id } = req.params;
    const body = req.body as { name?: string; address?: string | null };
    const existing = await prisma.branch.findFirst({ where: { id, clinicId } });
    if (!existing) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }
    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.address !== undefined ? { address: body.address === null ? null : body.address.trim() } : {}),
      },
    });
    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          clinicId,
          action: 'CLINIC_UPDATE_BRANCH',
          entity: 'BRANCH',
          entityId: id,
          details: JSON.stringify({ clinicId }),
        },
      })
      .catch(() => {});
    res.json({ branch });
  })
);

router.delete(
  '/branches/:id',
  requireRole('ADMIN'),
  requireActiveSubscription,
  requireSaaSClinicScopeAlignment,
  asyncRoute('clinic.branches.delete', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId || !assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.branch.findFirst({ where: { id, clinicId } });
    if (!existing) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }
    const count = await prisma.branch.count({ where: { clinicId } });
    if (count <= 1) {
      res.status(400).json({ error: 'Cannot delete the last branch for this clinic' });
      return;
    }
    await prisma.user.updateMany({ where: { branchId: id }, data: { branchId: null } });
    await prisma.branch.delete({ where: { id } });
    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          clinicId,
          action: 'CLINIC_DELETE_BRANCH',
          entity: 'BRANCH',
          entityId: id,
          details: JSON.stringify({ clinicId }),
        },
      })
      .catch(() => {});
    res.json({ ok: true });
  })
);

router.get(
  '/subscription',
  asyncRoute('clinic.subscription.get', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId || !assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const [clinic, sub] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true, plan: true, isActive: true } }),
      prisma.subscription.findUnique({
        where: { clinicId },
        include: { planRef: true },
      }),
    ]);
    const row = sub as SubscriptionWithPlan | null;
    const merged = mergePlanFeatures(row?.planRef?.features, row?.features);
    const deviceLimit = await resolveDeviceLimit(row);
    const distinctDevices = await prisma.deviceSession.findMany({
      where: { clinicId },
      distinct: ['deviceId'],
      select: { deviceId: true },
    });
    res.json({
      clinic,
      subscription: row
        ? {
            id: row.id,
            status: row.status,
            plan: effectivePlanName(row, clinic?.plan ?? 'FREE'),
            planId: row.planId,
            startDate: row.startDate,
            endDate: row.endDate ?? row.expiresAt,
            expiresAt: row.expiresAt,
            features: row.features,
            planFeatures: merged,
            deviceLimit,
            devicesInUse: distinctDevices.length,
            planRef: row.planRef,
          }
        : null,
    });
  })
);

router.get(
  '/activity-logs',
  asyncRoute('clinic.activityLogs.list', async (req: AuthRequest, res) => {
    const clinicId = scopeClinicId(req);
    if (!clinicId || !assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { page = '1', limit = '50', userId: filterUserId, from, to } = req.query as {
      page?: string;
      limit?: string;
      userId?: string;
      from?: string;
      to?: string;
    };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '50', 10), 1), 200);
    const skip = (pageNum - 1) * take;

    const baseScope: Prisma.ActivityLogWhereInput = {
      OR: [{ clinicId }, { user: { clinicId } }],
    };
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) createdAt.lte = d;
    }

    const parts: Prisma.ActivityLogWhereInput[] = [baseScope];
    if (filterUserId && filterUserId.trim().length > 0) {
      parts.push({ userId: filterUserId.trim(), user: { clinicId } });
    }
    if (createdAt.gte || createdAt.lte) {
      parts.push({ createdAt });
    }
    const where: Prisma.ActivityLogWhereInput = parts.length > 1 ? { AND: parts } : baseScope;
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true, role: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);
    res.json({ logs, total, page: pageNum, limit: take });
  })
);

export default router;
