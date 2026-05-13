import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireAdmin, requireSuperAdmin, type AuthRequest } from '../middleware/auth.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { signAccessToken } from '../utils/accessToken.js';
import { issueRefreshToken } from '../services/refreshTokenService.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { recordImpersonationFraud } from '../services/fraudAlertService.js';
import { effectivePlanName, type SubscriptionWithPlan } from '../services/planCatalog.js';
import { resolveJwtCapabilitiesForUser } from '../services/capabilityJwtPayload.js';

async function subscriptionPlanSnapshot(clinicId: string): Promise<string | undefined> {
  const [sub, clinic] = await Promise.all([
    prisma.subscription.findUnique({
      where: { clinicId },
      include: { planRef: true },
    }),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { plan: true } }),
  ]);
  return effectivePlanName(sub as SubscriptionWithPlan | null, clinic?.plan ?? 'FREE');
}

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

function canAccessClinic(req: AuthRequest, clinicId: string): boolean {
  if (req.user!.role === 'SUPER_ADMIN') return true;
  return req.user!.clinicId === clinicId;
}

const tenantInclude = {
  _count: { select: { users: true, products: true } },
  subscription: {
    include: {
      planRef: { select: { id: true, name: true, price: true, deviceLimit: true, features: true } },
    },
  },
} as const;

router.get(
  '/tenants',
  asyncRoute('admin.tenants.list', async (req: AuthRequest, res: Response) => {
    const where = req.user!.role === 'SUPER_ADMIN' ? {} : { id: req.user!.clinicId };
    const rows = await prisma.clinic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: tenantInclude,
    });
    const data = rows.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      isActive: c.isActive,
      address: c.address,
      phone: c.phone,
      email: c.email,
      logo: c.logo,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      subscription: c.subscription,
      userCount: c._count.users,
      productCount: c._count.products,
    }));
    res.json({ success: true, data });
  })
);

router.get(
  '/tenant/:id',
  asyncRoute('admin.tenants.get', async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!canAccessClinic(req, id)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const c = await prisma.clinic.findUnique({
      where: { id },
      include: tenantInclude,
    });
    if (!c) {
      res.status(404).json({ success: false, error: 'Tenant not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        plan: c.plan,
        isActive: c.isActive,
        address: c.address,
        phone: c.phone,
        email: c.email,
        logo: c.logo,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        subscription: c.subscription,
        userCount: c._count.users,
        productCount: c._count.products,
      },
    });
  })
);

router.patch(
  '/tenant/:id/block',
  asyncRoute('admin.tenants.block', async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!canAccessClinic(req, id)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const existing = await prisma.clinic.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Tenant not found' });
      return;
    }
    const updated = await prisma.clinic.update({
      where: { id },
      data: { isActive: false },
      include: tenantInclude,
    });
    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        plan: updated.plan,
        isActive: updated.isActive,
        subscription: updated.subscription,
        userCount: updated._count.users,
        productCount: updated._count.products,
      },
    });
  })
);

router.get(
  '/subscriptions',
  asyncRoute('admin.subscriptions.list', async (req: AuthRequest, res: Response) => {
    const where = req.user!.role === 'SUPER_ADMIN' ? {} : { clinicId: req.user!.clinicId };
    const rows = await prisma.subscription.findMany({
      where,
      include: {
        clinic: { select: { id: true, name: true, isActive: true } },
        planRef: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: rows });
  })
);

router.patch(
  '/subscriptions/:clinicId',
  asyncRoute('admin.subscriptions.patch', async (req: AuthRequest, res: Response) => {
    const { clinicId } = req.params;
    if (!canAccessClinic(req, clinicId)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const body = req.body as { plan?: string; status?: string; features?: unknown };
    const data: { plan?: string; status?: string; features?: object; planId?: string | null } = {};
    if (typeof body.plan === 'string' && body.plan.trim()) {
      const code = body.plan.trim().toUpperCase();
      data.plan = code;
      const catalog = await prisma.plan.findUnique({ where: { name: code } });
      data.planId = catalog?.id ?? null;
    }
    if (typeof body.status === 'string' && body.status.trim()) data.status = body.status.trim().toUpperCase();
    if (body.features !== undefined && typeof body.features === 'object' && body.features !== null) {
      data.features = body.features as object;
    }
    if (Object.keys(data).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }
    const updated = await prisma.subscription.update({
      where: { clinicId },
      data,
    });
    if (typeof data.plan === 'string') {
      await prisma.clinic.update({ where: { id: clinicId }, data: { plan: data.plan } }).catch(() => {});
    }
    res.json({ success: true, data: updated });
  })
);

/** SUPER_ADMIN only: short-lived JWT scoped to another clinic (support / debugging). */
router.post(
  '/impersonate/:clinicId',
  requireSuperAdmin,
  asyncRoute('admin.impersonate', async (req: AuthRequest, res: Response) => {
    const { clinicId } = req.params;
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }
    const adminRow = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, role: true, clinicId: true, sessionVersion: true },
    });
    if (!adminRow) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    const planSnapshot = await subscriptionPlanSnapshot(clinicId);
    const capabilities = await resolveJwtCapabilitiesForUser({ role: adminRow.role, clinicId: adminRow.clinicId });
    const impersonationJti = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await prisma.impersonationSession.create({
      data: {
        jti: impersonationJti,
        actorUserId: adminRow.id,
        targetClinicId: clinic.id,
        expiresAt,
      },
    });
    const token = signAccessToken(
      {
        id: adminRow.id,
        email: adminRow.email,
        role: adminRow.role,
        clinicId: adminRow.clinicId,
        sessionVersion: adminRow.sessionVersion,
      },
      {
        clinicIdOverride: clinic.id,
        impersonating: true,
        impersonatedBy: adminRow.id,
        impersonationJti,
        planSnapshot,
        capabilities,
        expiresIn: '15m',
      }
    );
    const refreshToken = await issueRefreshToken(adminRow.id);
    await prisma.activityLog
      .create({
        data: {
          userId: adminRow.id,
          action: 'IMPERSONATE_CLINIC',
          entity: 'CLINIC',
          entityId: clinic.id,
          details: JSON.stringify({ targetClinicId: clinic.id }),
        },
      })
      .catch(() => {});
    void writeAuditLog({
      userId: adminRow.id,
      clinicId: clinic.id,
      action: 'IMPERSONATE_CLINIC',
      entityType: 'CLINIC',
      entityId: clinic.id,
      metadata: { targetClinicId: clinic.id, actorUserId: adminRow.id, impersonationJti },
    });
    void recordImpersonationFraud(clinic.id, adminRow.id, 'IMPERSONATE_TOKEN_ISSUED');
    res.json({
      success: true,
      token,
      refreshToken,
      clinicId: clinic.id,
      expiresIn: '15m',
      impersonationJti,
    });
  })
);

/** Revoke an active impersonation session (invalidates JWTs that carry the same `impersonationJti`). */
router.post(
  '/impersonation/revoke',
  requireSuperAdmin,
  asyncRoute('admin.impersonation.revoke', async (req: AuthRequest, res: Response) => {
    const jti = typeof (req.body as { jti?: unknown }).jti === 'string' ? (req.body as { jti: string }).jti.trim() : '';
    if (!jti) {
      res.status(400).json({ success: false, error: 'jti is required' });
      return;
    }
    const r = await prisma.impersonationSession.updateMany({
      where: { jti, actorUserId: req.user!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    void writeAuditLog({
      userId: req.user!.id,
      action: 'IMPERSONATION_REVOKED',
      entityType: 'IMPERSONATION_SESSION',
      entityId: jti,
      metadata: { count: r.count },
    });
    res.json({ success: true, data: { revoked: r.count } });
  })
);

export default router;
