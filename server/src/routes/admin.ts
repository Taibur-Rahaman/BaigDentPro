import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { assertPasswordAcceptable } from '../utils/passwordPolicy.js';
import { syncSupabasePasswordForEmail } from '../services/supabaseAuthSync.js';
import { isPrismaUniqueViolation } from '../utils/prismaErrors.js';
import { sendSafeError } from '../utils/safeError.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { validateBody } from '../middleware/validateBody.js';
import { adminDisableClinicBodySchema, adminUpgradePlanBodySchema } from '../validation/schemas.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'RECEPTIONIST']);

/** SaaS / admin list scope: super admin = global unless impersonating a clinic. */
function adminDataScope(req: AuthRequest): { mode: 'all' } | { mode: 'clinic'; clinicId: string } | { mode: 'none' } {
  if (req.user!.role === 'SUPER_ADMIN') {
    if (req.impersonating === true && req.effectiveClinicId) {
      return { mode: 'clinic', clinicId: req.effectiveClinicId };
    }
    return { mode: 'all' };
  }
  if (!req.user!.clinicId) {
    return { mode: 'none' };
  }
  return { mode: 'clinic', clinicId: req.user!.clinicId };
}

function userWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.UserWhereInput {
  if (scope.mode === 'none') {
    return { id: { in: [] } };
  }
  if (scope.mode === 'clinic') {
    return { clinicId: scope.clinicId };
  }
  return {};
}

function clinicWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.ClinicWhereInput {
  if (scope.mode === 'none') {
    return { id: '__none__' };
  }
  if (scope.mode === 'clinic') {
    return { id: scope.clinicId };
  }
  return {};
}

function orderWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.OrderWhereInput {
  if (scope.mode === 'none') {
    return { id: { in: [] } };
  }
  if (scope.mode === 'clinic') {
    return { clinicId: scope.clinicId };
  }
  return {};
}

function productWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.ProductWhereInput {
  if (scope.mode === 'none') {
    return { id: { in: [] } };
  }
  if (scope.mode === 'clinic') {
    return { clinicId: scope.clinicId };
  }
  return {};
}

function auditLogWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.AuditLogWhereInput {
  if (scope.mode === 'none') {
    return { id: { in: [] } };
  }
  if (scope.mode === 'clinic') {
    return { user: { clinicId: scope.clinicId } };
  }
  return {};
}

function logAdminPanelAccess(req: AuthRequest, action: string, metadata?: Record<string, unknown>): void {
  void writeAuditLog({
    userId: req.user!.id,
    action,
    metadata: {
      actorRole: req.user!.role,
      impersonating: Boolean(req.impersonating),
      ...(req.effectiveClinicId ? { effectiveClinicId: req.effectiveClinicId } : {}),
      ...metadata,
    },
  });
}

function clinicScopedWhere(req: AuthRequest): { clinicId: string } | Record<string, never> {
  if (req.user!.role === 'SUPER_ADMIN') {
    return {};
  }
  if (!req.user!.clinicId) {
    return { clinicId: '__none__' } as { clinicId: string };
  }
  return { clinicId: req.user!.clinicId };
}

async function getTargetUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      clinicName: true,
      clinicId: true,
      isActive: true,
      createdAt: true,
    },
  });
}

function assertCanManage(req: AuthRequest, target: NonNullable<Awaited<ReturnType<typeof getTargetUser>>>) {
  if (req.user!.role === 'SUPER_ADMIN') {
    return;
  }
  if (target.role === 'SUPER_ADMIN') {
    throw Object.assign(new Error('Cannot manage platform administrators'), { status: 403 });
  }
  if (!req.user!.clinicId || target.clinicId !== req.user!.clinicId) {
    throw Object.assign(new Error('User is not in your clinic'), { status: 403 });
  }
}

function subscriptionWhereFromScope(scope: ReturnType<typeof adminDataScope>): Prisma.SubscriptionWhereInput {
  if (scope.mode === 'none') {
    return { clinicId: { in: [] } };
  }
  if (scope.mode === 'clinic') {
    return { clinicId: scope.clinicId };
  }
  return {};
}

/** Aggregated counts for the admin control dashboard (scoped for clinic admins). */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const scope = adminDataScope(req);
    const userWhere = userWhereFromScope(scope);
    const clinicWhere = clinicWhereFromScope(scope);
    const orderWhere = orderWhereFromScope(scope);
    const productWhere = productWhereFromScope(scope);
    const subWhere = subscriptionWhereFromScope(scope);
    const auditBase = auditLogWhereFromScope(scope);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const audit7dWhere: Prisma.AuditLogWhereInput = { ...auditBase, createdAt: { gte: weekAgo } };

    const [users, clinics, saasOrders, saasProducts, subscriptions, auditLogs7d] = await prisma.$transaction([
      prisma.user.count({ where: userWhere }),
      prisma.clinic.count({ where: clinicWhere }),
      prisma.order.count({ where: orderWhere }),
      prisma.product.count({ where: productWhere }),
      prisma.subscription.count({ where: subWhere }),
      prisma.auditLog.count({ where: audit7dWhere }),
    ]);

    logAdminPanelAccess(req, 'ADMIN_PANEL_GET_STATS', {
      scopeMode: scope.mode,
    });

    res.json({
      users,
      clinics,
      saasOrders,
      saasProducts,
      subscriptions,
      auditLogs7d,
    });
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.stats');
  }
});

/** Tenant SaaS orders (table `saas_orders`) — no payment secrets, no full patient payloads. */
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    const scope = adminDataScope(req);
    const where = orderWhereFromScope(scope);
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
    const skip = (pageNum - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clinicId: true,
          currency: true,
          status: true,
          subtotal: true,
          total: true,
          paymentStatus: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          clinic: { select: { id: true, name: true, plan: true, isActive: true } },
          _count: { select: { items: true, transactions: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    logAdminPanelAccess(req, 'ADMIN_PANEL_LIST_ORDERS', { page: pageNum, limit: take });

    res.json({ orders, total, page: pageNum, limit: take });
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.orders.list');
  }
});

/** Structured audit trail entries (metadata may contain operational context). */
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const scope = adminDataScope(req);
    const where = auditLogWhereFromScope(scope);
    const { page = '1', limit = '30' } = req.query as { page?: string; limit?: string };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '30', 10), 1), 100);
    const skip = (pageNum - 1) * take;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          action: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              clinicId: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    logAdminPanelAccess(req, 'ADMIN_PANEL_LIST_AUDIT_LOGS', { page: pageNum, limit: take });

    res.json({ logs, total, page: pageNum, limit: take });
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.auditLogs.list');
  }
});

router.get('/users', async (req: AuthRequest, res) => {
  try {
    const { search, role, page = '1', limit = '20', clinicId: filterClinicId } = req.query as {
      search?: string;
      role?: string;
      page?: string;
      limit?: string;
      clinicId?: string;
    };

    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
    const skip = (pageNum - 1) * take;

    const where: Record<string, unknown> = {};

    if (req.user!.role === 'SUPER_ADMIN') {
      if (req.impersonating === true && req.effectiveClinicId) {
        where.clinicId = req.effectiveClinicId;
        if (filterClinicId && filterClinicId !== req.effectiveClinicId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } else if (filterClinicId) {
        where.clinicId = filterClinicId;
      }
    } else {
      const scope = clinicScopedWhere(req);
      if ('clinicId' in scope && scope.clinicId === '__none__') {
        return res.json({ users: [], total: 0, page: pageNum, limit: take });
      }
      Object.assign(where, scope);
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          clinicName: true,
          clinicId: true,
          isActive: true,
          isApproved: true,
          createdAt: true,
          clinic: { select: { id: true, name: true, plan: true, isActive: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    logAdminPanelAccess(req, 'ADMIN_PANEL_LIST_USERS', { page: pageNum, limit: take });

    res.json({ users, total, page: pageNum, limit: take });
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.users.list');
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { email, password, name, phone, role: requestedRole } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
      role?: string;
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }

    assertPasswordAcceptable(password, 'Password');

    let clinicId: string | null = null;
    let newRole = 'DOCTOR';

    if (req.user!.role === 'SUPER_ADMIN') {
      const { clinicId: bodyClinicId } = req.body as { clinicId?: string };
      if (!bodyClinicId?.trim()) {
        return res.status(400).json({ error: 'clinicId is required when creating users as platform admin' });
      }
      const clinic = await prisma.clinic.findUnique({ where: { id: bodyClinicId } });
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      clinicId = clinic.id;
      if (requestedRole && ALLOWED_ROLES.has(requestedRole)) {
        newRole = requestedRole;
      }
    } else {
      if (!req.user!.clinicId) {
        return res.status(400).json({ error: 'Your account is not linked to a clinic' });
      }
      clinicId = req.user!.clinicId;
      if (requestedRole === 'CLINIC_ADMIN') {
        newRole = 'CLINIC_ADMIN';
      }
      if (requestedRole === 'RECEPTIONIST') {
        newRole = 'RECEPTIONIST';
      }
      if (requestedRole === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot assign platform admin role' });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const adminClinic = clinicId
      ? await prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } })
      : null;

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          name: name.trim(),
          phone: phone?.trim() || null,
          role: newRole,
          clinicId,
          clinicName: adminClinic?.name ?? undefined,
          isActive: true,
          isApproved: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          clinicName: true,
          clinicId: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (e: unknown) {
      if (isPrismaUniqueViolation(e)) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw e;
    }

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'ADMIN_CREATE_USER',
          entity: 'USER',
          entityId: user.id,
          details: JSON.stringify({ email: user.email, role: user.role }),
        },
      })
      .catch(() => {});

    void writeAuditLog({
      userId: req.user!.id,
      action: 'ADMIN_CREATE_USER',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    void syncSupabasePasswordForEmail(user.email, password).then((r) => {
      if (!r.synced && r.note && r.note !== 'supabase_not_configured') {
        console.warn('[admin create user] Supabase Auth sync:', r.note);
      }
    });

    res.status(201).json(user);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Password') || msg.includes('characters')) {
      return res.status(400).json({ error: msg });
    }
    sendSafeError(res, 500, error, 'admin.users.create');
  }
});

router.put('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, clinicName, phone, isActive, name } = req.body as {
      role?: string;
      clinicName?: string;
      phone?: string;
      isActive?: boolean;
      name?: string;
    };

    if (id === req.user!.id && isActive === false) {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const target = await getTargetUser(id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      assertCanManage(req, target);
    } catch (e: any) {
      return res.status(e.status || 403).json({ error: e.message });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (clinicName !== undefined) data.clinicName = clinicName;
    if (phone !== undefined) data.phone = phone;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    if (role !== undefined) {
      if (!ALLOWED_ROLES.has(role) && role !== 'SUPER_ADMIN') {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (req.user!.role !== 'SUPER_ADMIN') {
        if (role === 'SUPER_ADMIN') {
          return res.status(403).json({ error: 'Cannot assign platform admin role' });
        }
      }
      if (role === 'SUPER_ADMIN' && target.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Use platform tools to promote super admins' });
      }
      data.role = role;
      if (role !== target.role) {
        data.sessionVersion = { increment: 1 };
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        clinicName: true,
        clinicId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'ADMIN_UPDATE_USER',
          entity: 'USER',
          entityId: user.id,
          details: JSON.stringify({ updates: req.body }),
        },
      })
      .catch(() => {});

    void writeAuditLog({
      userId: req.user!.id,
      action: 'ADMIN_UPDATE_USER',
      entityId: user.id,
      metadata: { targetUserId: user.id },
    });

    res.json(user);
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.users.update');
  }
});

/** Clinics directory: global for super admin; own clinic for clinic admins. */
router.get('/clinics', async (req: AuthRequest, res) => {
  try {
    const scope = adminDataScope(req);
    const clinicWhere = clinicWhereFromScope(scope);
    const clinics = await prisma.clinic.findMany({
      where: clinicWhere,
      orderBy: { name: 'asc' },
        select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        ownerId: true,
        phone: true,
        email: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true, products: true, orders: true, branches: true } },
      },
      take: scope.mode === 'all' ? 500 : 50,
    });
    logAdminPanelAccess(req, 'ADMIN_PANEL_LIST_CLINICS', { count: clinics.length });
    res.json({ clinics });
  } catch (error: unknown) {
    sendSafeError(res, 500, error, 'admin.clinics.list');
  }
});

router.put(
  '/upgrade-plan',
  requireRole('SUPER_ADMIN'),
  validateBody(adminUpgradePlanBodySchema),
  async (req: AuthRequest, res) => {
    try {
      const { clinicId, planName } = req.body as { clinicId: string; planName: string };
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) {
        res.status(404).json({ error: 'Clinic not found' });
        return;
      }
      const plan = await prisma.plan.findUnique({ where: { name: planName } });
      if (!plan) {
        res.status(404).json({ error: 'Plan not found. Run database seed to install catalog plans.' });
        return;
      }
      const now = new Date();
      await prisma.$transaction([
        prisma.subscription.upsert({
          where: { clinicId },
          create: {
            clinicId,
            planId: plan.id,
            plan: plan.name,
            status: 'ACTIVE',
            startDate: now,
          },
          update: {
            planId: plan.id,
            plan: plan.name,
            status: 'ACTIVE',
            startDate: now,
            endDate: null,
            expiresAt: null,
          },
        }),
        prisma.clinic.update({
          where: { id: clinicId },
          data: { plan: plan.name },
        }),
      ]);

      await prisma.activityLog
        .create({
          data: {
            userId: req.user!.id,
            action: 'SUPER_ADMIN_UPGRADE_PLAN',
            entity: 'SUBSCRIPTION',
            entityId: clinicId,
            details: JSON.stringify({ planName }),
          },
        })
        .catch(() => {});

      void writeAuditLog({
        userId: req.user!.id,
        action: 'SUPER_ADMIN_UPGRADE_PLAN',
        entityId: clinicId,
        metadata: { clinicId, planName },
      });

      logAdminPanelAccess(req, 'ADMIN_UPGRADE_PLAN', { clinicId, planName });
      res.json({ ok: true, clinicId, planName });
    } catch (error: unknown) {
      sendSafeError(res, 500, error, 'admin.upgrade-plan');
    }
  }
);

router.post(
  '/disable-clinic',
  requireRole('SUPER_ADMIN'),
  validateBody(adminDisableClinicBodySchema),
  async (req: AuthRequest, res) => {
    try {
      const { clinicId, disabled } = req.body as { clinicId: string; disabled: boolean };
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) {
        res.status(404).json({ error: 'Clinic not found' });
        return;
      }
      await prisma.clinic.update({
        where: { id: clinicId },
        data: { isActive: !disabled },
      });

      await prisma.activityLog
        .create({
          data: {
            userId: req.user!.id,
            action: disabled ? 'SUPER_ADMIN_DISABLE_CLINIC' : 'SUPER_ADMIN_ENABLE_CLINIC',
            entity: 'CLINIC',
            entityId: clinicId,
            details: JSON.stringify({ disabled }),
          },
        })
        .catch(() => {});

      void writeAuditLog({
        userId: req.user!.id,
        action: disabled ? 'SUPER_ADMIN_DISABLE_CLINIC' : 'SUPER_ADMIN_ENABLE_CLINIC',
        entityId: clinicId,
        metadata: { clinicId, disabled },
      });

      logAdminPanelAccess(req, 'ADMIN_DISABLE_CLINIC', { clinicId, disabled });
      res.json({ ok: true, clinicId, isActive: !disabled });
    } catch (error: unknown) {
      sendSafeError(res, 500, error, 'admin.disable-clinic');
    }
  }
);

export default router;
