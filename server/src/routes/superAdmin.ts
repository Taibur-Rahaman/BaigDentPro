import { Router } from 'express';
import { prisma, prismaBase } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { approveSignupBodySchema, superAdminCapabilityOverridesPutBodySchema, type ApproveSignupBody } from '../validation/schemas.js';
import { deleteSupabaseUserByEmail, inviteSupabaseUserIfAbsent } from '../services/supabaseAuthSync.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { auditSuperAdminPrismaBaseAccess } from '../utils/superAdminPrismaAudit.js';
import { resetAllDemoClinics } from '../services/demoClinicReset.js';
import { sanitizeDegree, sanitizeSpecialization, sanitizeTitle } from '../utils/professionalIdentity.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { CAPABILITIES, isCapabilityString } from '../security/capabilities.js';
import { CAPABILITY_REQUIRES_FEATURE } from '../security/capabilityEngine.js';

const router = Router();

async function findClinicById(clinicId: string) {
  return prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
}

/** Last occurrence wins — avoids Prisma unique violations on duplicate keys in one payload. */
function dedupeCapabilityOverrides(
  rows: readonly { capabilityKey: string; grant: boolean }[],
): { capabilityKey: string; grant: boolean }[] {
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.capabilityKey, row.grant);
  }
  return [...map.entries()].map(([capabilityKey, grant]) => ({ capabilityKey, grant }));
}

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.use((req, res, next) => {
  const a = req as AuthRequest;
  void writeAuditLog({
    userId: a.user?.id ?? 'unknown',
    clinicId: null,
    action: 'SUPER_ADMIN_API',
    entityType: 'HTTP',
    metadata: { method: req.method, path: req.originalUrl ?? req.url },
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? null,
  });
  next();
});

router.get('/capabilities/catalog', requireCapability('system:admin'), (_req: AuthRequest, res) => {
  res.json({
    capabilities: CAPABILITIES.map((key) => ({
      key,
      requiresProductFeature: CAPABILITY_REQUIRES_FEATURE[key] ?? null,
    })),
  });
});

router.get(
  '/clinics/:clinicId/capability-overrides',
  requireCapability('system:admin'),
  async (req: AuthRequest, res) => {
    try {
      const { clinicId } = req.params;
      const clinic = await findClinicById(clinicId);
      if (!clinic) {
        res.status(404).json({ error: 'Clinic not found' });
        return;
      }
      const overrides = await prisma.clinicCapabilityOverride.findMany({
        where: { clinicId },
        select: { capabilityKey: true, grant: true },
        orderBy: { capabilityKey: 'asc' },
      });
      res.json({ clinicId, overrides });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  },
);

router.put(
  '/clinics/:clinicId/capability-overrides',
  requireCapability('system:admin'),
  validateBody(superAdminCapabilityOverridesPutBodySchema),
  async (req: AuthRequest, res) => {
    try {
      const { clinicId } = req.params;
      const clinic = await findClinicById(clinicId);
      if (!clinic) {
        res.status(404).json({ error: 'Clinic not found' });
        return;
      }
      const raw = (req.body as { overrides: { capabilityKey: string; grant: boolean }[] }).overrides;
      const overrides = dedupeCapabilityOverrides(raw);
      for (const row of overrides) {
        if (!isCapabilityString(row.capabilityKey)) {
          res.status(400).json({ error: `Unknown capability: ${row.capabilityKey}` });
          return;
        }
      }
      await prisma.$transaction(async (tx) => {
        await tx.clinicCapabilityOverride.deleteMany({ where: { clinicId } });
        if (overrides.length > 0) {
          await tx.clinicCapabilityOverride.createMany({
            data: overrides.map((o) => ({
              clinicId,
              capabilityKey: o.capabilityKey,
              grant: o.grant,
            })),
          });
        }
      });
      void writeAuditLog({
        userId: req.user!.id,
        clinicId,
        action: 'SUPER_ADMIN_CAPABILITY_OVERRIDES',
        entityType: 'CLINIC',
        entityId: clinicId,
        metadata: { count: overrides.length },
      });
      res.json({ ok: true, clinicId, count: overrides.length });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  },
);

// List all clinics (users) with basic stats
router.get('/clinics', async (req: AuthRequest, res) => {
  try {
    const { search, page = '1', limit = '20' } = req.query as { search?: string; page?: string; limit?: string };
    const skip = (parseInt(page || '1', 10) - 1) * parseInt(limit || '20', 10);
    const take = Math.min(parseInt(limit || '20', 10), 100);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clinicId: true,
          email: true,
          name: true,
          role: true,
          clinicName: true,
          clinicAddress: true,
          clinicPhone: true,
          createdAt: true,
          _count: {
            select: { patients: true, appointments: true, prescriptions: true, invoices: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ clinics: users, total, page: parseInt(page || '1', 10), limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Branch-wise revenue (revenue per user/clinic)
router.get('/revenue-by-branch', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const users = await prisma.user.findMany({
      select: { id: true, name: true, clinicName: true, email: true },
    });

    auditSuperAdminPrismaBaseAccess(req, 'GET /revenue-by-branch invoice.groupBy');
    const revenueByUser = await prismaBase.invoice.groupBy({
      by: ['userId'],
      where: {
        date: { gte: start, lte: end },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { paid: true, total: true },
      _count: { id: true },
    });

    const map = new Map(revenueByUser.map((r) => [r.userId, r]));
    const branches = users.map((u) => ({
      userId: u.id,
      name: u.name,
      clinicName: u.clinicName,
      email: u.email,
      revenue: Number(map.get(u.id)?._sum.paid ?? 0),
      totalInvoiced: Number(map.get(u.id)?._sum.total ?? 0),
      invoiceCount: map.get(u.id)?._count.id ?? 0,
    }));

    branches.sort((a, b) => b.revenue - a.revenue);
    res.json({ branches, start: start.toISOString(), end: end.toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chair utilization: appointments per clinic per day (simplified)
router.get('/chair-utilization', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();

    auditSuperAdminPrismaBaseAccess(req, 'GET /chair-utilization appointment.groupBy');
    const byUser = await prismaBase.appointment.groupBy({
      by: ['userId'],
      where: {
        date: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
      },
      _count: { id: true },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: byUser.map((b) => b.userId) } },
      select: { id: true, name: true, clinicName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const utilization = byUser.map((b) => ({
      userId: b.userId,
      clinicName: userMap.get(b.userId)?.clinicName,
      userName: userMap.get(b.userId)?.name,
      appointmentCount: b._count.id,
    }));

    utilization.sort((a, b) => b.appointmentCount - a.appointmentCount);
    res.json({ utilization, start: start.toISOString(), end: end.toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activity logs (all users)
router.get('/activity-logs', async (req: AuthRequest, res) => {
  try {
    const { userId, action, entity, page = '1', limit = '50' } = req.query as {
      userId?: string;
      action?: string;
      entity?: string;
      page?: string;
      limit?: string;
    };
    const skip = (parseInt(page || '1', 10) - 1) * parseInt(limit || '50', 10);
    const take = Math.min(parseInt(limit || '50', 10), 200);

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, clinicName: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page || '1', 10), limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Registrations waiting for platform approval (self-service sign up)
router.get('/pending-signups', async (_req: AuthRequest, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' },
        /** Must match reject-signup guard (`!isApproved`). Do not include approved rows — OR `accountStatus: PENDING` alone matched approved users stuck with legacy PENDING status and made Reject return 400. */
        isApproved: false,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        clinicName: true,
        title: true,
        degree: true,
        specialization: true,
        professionalVerified: true,
        role: true,
        clinicId: true,
        accountStatus: true,
        createdAt: true,
        clinic: { select: { id: true, name: true } },
      },
    });
    res.json({ pending, count: pending.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/users/:id/approve-signup',
  validateBody(approveSignupBodySchema),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const body = req.body as ApproveSignupBody;
      const existing = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          isApproved: true,
          clinicId: true,
        },
      });
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (existing.isApproved) {
        return res.status(400).json({ error: 'Account is already approved' });
      }

      const now = new Date();
      const user = await prisma.$transaction(async (tx) => {
        if (body.catalogPlanName && existing.clinicId) {
          const plan = await tx.plan.findUnique({ where: { name: body.catalogPlanName } });
          if (!plan) {
            throw new Error(`Plan ${body.catalogPlanName} not found. Run database seed.`);
          }
          await tx.subscription.upsert({
            where: { clinicId: existing.clinicId },
            create: {
              clinicId: existing.clinicId,
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
          });
          await tx.clinic.update({
            where: { id: existing.clinicId },
            data: { plan: plan.name },
          });
        }

        const data = {
          isApproved: true,
          accountStatus: 'ACTIVE',
          role: body.role,
          ...(body.title !== undefined ? { title: sanitizeTitle(body.title) } : {}),
          ...(body.degree !== undefined ? { degree: sanitizeDegree(body.degree) } : {}),
          ...(body.specialization !== undefined ? { specialization: sanitizeSpecialization(body.specialization) } : {}),
          ...(body.professionalVerified === true
            ? { professionalVerified: true, professionalVerifiedAt: now }
            : body.professionalVerified === false
              ? { professionalVerified: false, professionalVerifiedAt: null }
              : {}),
        };

        return tx.user.update({
          where: { id },
          data,
          select: {
            id: true,
            email: true,
            name: true,
            title: true,
            degree: true,
            specialization: true,
            professionalVerified: true,
            professionalVerifiedAt: true,
            role: true,
            clinicName: true,
            clinicId: true,
            isApproved: true,
            accountStatus: true,
          },
        });
      });

      await prisma.activityLog
        .create({
          data: {
            userId: req.user!.id,
            action: 'SUPER_ADMIN_APPROVE_SIGNUP',
            entity: 'USER',
            entityId: id,
            details: JSON.stringify({
              email: user.email,
              role: user.role,
              catalogPlanName: body.catalogPlanName,
              professionalVerified: user.professionalVerified,
            }),
          },
        })
        .catch(() => {});

      void inviteSupabaseUserIfAbsent(user.email).then((r) => {
        if (r.invited) {
          console.log('[approve-signup] Supabase invite sent for', user.email);
        }
      });

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/users/:id/reject-signup', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isApproved) {
      return res.status(400).json({ error: 'Cannot reject an already approved account' });
    }
    if (user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Invalid operation' });
    }
    const clinicId = user.clinicId;
    const emailSnapshot = user.email;

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      if (clinicId) {
        const remaining = await tx.user.count({ where: { clinicId } });
        if (remaining === 0) {
          await tx.clinic.delete({ where: { id: clinicId } }).catch(() => {});
        }
      }
    });

    await deleteSupabaseUserByEmail(emailSnapshot);

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'SUPER_ADMIN_REJECT_SIGNUP',
          entity: 'USER',
          entityId: id,
          details: JSON.stringify({ email: emailSnapshot }),
        },
      })
      .catch(() => {});

    void writeAuditLog({
      userId: req.user!.id,
      clinicId: null,
      action: 'SUPER_ADMIN_REJECT_SIGNUP',
      entityType: 'USER',
      entityId: id,
      metadata: { rejectedEmail: emailSnapshot },
    });

    console.info('[super-admin] reject-signup ok', { actorId: req.user!.id, rejectedUserId: id, email: emailSnapshot });
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[super-admin] reject-signup failed', { error: msg });
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
    if (code === 'P2003') {
      res.status(409).json({
        error:
          'Cannot delete this signup: related records still reference this user. Remove dependent data or contact support.',
      });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

// Global stats for super admin dashboard
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    auditSuperAdminPrismaBaseAccess(req, 'GET /stats prismaBase');
    const [
      totalClinics,
      totalPatients,
      totalAppointments,
      totalPrescriptions,
      totalRevenue,
      activityLogCount,
    ] = await Promise.all([
      prisma.user.count(),
      prismaBase.patient.count(),
      prismaBase.appointment.count(),
      prismaBase.prescription.count(),
      prismaBase.invoice.aggregate({ where: { status: { in: ['PAID', 'PARTIAL'] } }, _sum: { paid: true } }),
      prisma.activityLog.count(),
    ]);

    res.json({
      totalClinics,
      totalPatients,
      totalAppointments,
      totalPrescriptions,
      totalRevenue: Number(totalRevenue._sum.paid ?? 0),
      activityLogCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/doctors', async (req: AuthRequest, res) => {
  try {
    const { search, clinicId, page = '1', limit = '20' } = req.query as {
      search?: string;
      clinicId?: string;
      page?: string;
      limit?: string;
    };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
    const skip = (pageNum - 1) * take;

    const where: any = {
      role: { in: ['DOCTOR', 'CLINIC_ADMIN'] },
    };
    if (clinicId) {
      where.clinicId = clinicId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          clinicId: true,
          clinicName: true,
          clinicAddress: true,
          clinicPhone: true,
          title: true,
          degree: true,
          specialization: true,
          professionalVerified: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              patients: true,
              prescriptions: true,
              appointments: true,
              invoices: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ doctors, total, page: pageNum, limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/doctors/:id', requireCapability('clinic:doctors:manage'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify super admin account from this endpoint' });
    }

    const {
      name,
      phone,
      clinicName,
      clinicAddress,
      clinicPhone,
      title,
      degree,
      specialization,
      isActive,
      role,
      professionalVerified,
    } = req.body as {
      name?: string;
      phone?: string;
      clinicName?: string;
      clinicAddress?: string;
      clinicPhone?: string;
      title?: string | null;
      degree?: string | null;
      specialization?: string | null;
      isActive?: boolean;
      role?: string;
      professionalVerified?: boolean;
    };

    const allowedRoles = new Set([
      'DOCTOR',
      'CLINIC_ADMIN',
      'CLINIC_OWNER',
      'STORE_MANAGER',
      'RECEPTIONIST',
      'LAB_TECH',
      'DENTAL_ASSISTANT',
    ]);

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (clinicName !== undefined) data.clinicName = clinicName ? String(clinicName).trim() : null;
    if (clinicAddress !== undefined) data.clinicAddress = clinicAddress ? String(clinicAddress).trim() : null;
    if (clinicPhone !== undefined) data.clinicPhone = clinicPhone ? String(clinicPhone).trim() : null;
    if (title !== undefined) data.title = sanitizeTitle(title);
    if (degree !== undefined) data.degree = sanitizeDegree(degree);
    if (specialization !== undefined) data.specialization = sanitizeSpecialization(specialization);
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (professionalVerified === true) {
      data.professionalVerified = true;
      data.professionalVerifiedAt = new Date();
    } else if (professionalVerified === false) {
      data.professionalVerified = false;
      data.professionalVerifiedAt = null;
    }
    if (role !== undefined) {
      if (!allowedRoles.has(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      data.role = role;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        clinicId: true,
        clinicName: true,
        clinicAddress: true,
        clinicPhone: true,
        title: true,
        degree: true,
        specialization: true,
        professionalVerified: true,
        professionalVerifiedAt: true,
        isActive: true,
      },
    });

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'SUPER_ADMIN_UPDATE_DOCTOR',
          entity: 'USER',
          entityId: id,
          details: JSON.stringify({ email: target.email, updates: data }),
        },
      })
      .catch(() => {});

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/patients', async (req: AuthRequest, res) => {
  try {
    const { search, doctorId, page = '1', limit = '20' } = req.query as {
      search?: string;
      doctorId?: string;
      page?: string;
      limit?: string;
    };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '20', 10), 1), 200);
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (doctorId) where.userId = doctorId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { regNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    auditSuperAdminPrismaBaseAccess(req, 'GET /patients prismaBase');
    const [patients, total] = await Promise.all([
      prismaBase.patient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          regNo: true,
          name: true,
          age: true,
          gender: true,
          phone: true,
          email: true,
          address: true,
          bloodGroup: true,
          occupation: true,
          referredBy: true,
          notes: true,
          userId: true,
          updatedAt: true,
          user: {
            select: { id: true, name: true, email: true, clinicName: true },
          },
          _count: {
            select: { prescriptions: true, appointments: true, invoices: true },
          },
        },
      }),
      prismaBase.patient.count({ where }),
    ]);

    res.json({ patients, total, page: pageNum, limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/patients/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    auditSuperAdminPrismaBaseAccess(req, 'PUT /patients/:id prismaBase read');
    const existing = await prismaBase.patient.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { name, phone, age, gender, email, address, bloodGroup, occupation, referredBy, notes } = req.body as {
      name?: string;
      phone?: string;
      age?: number | string | null;
      gender?: string;
      email?: string;
      address?: string;
      bloodGroup?: string;
      occupation?: string;
      referredBy?: string;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = String(phone).trim();
    if (age !== undefined) data.age = age === null || age === '' ? null : parseInt(String(age), 10);
    if (gender !== undefined) data.gender = gender ? String(gender).trim() : null;
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (bloodGroup !== undefined) data.bloodGroup = bloodGroup ? String(bloodGroup).trim() : null;
    if (occupation !== undefined) data.occupation = occupation ? String(occupation).trim() : null;
    if (referredBy !== undefined) data.referredBy = referredBy ? String(referredBy).trim() : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;

    auditSuperAdminPrismaBaseAccess(req, 'PUT /patients/:id prismaBase update');
    const updated = await prismaBase.patient.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, clinicName: true } },
      },
    });

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'SUPER_ADMIN_UPDATE_PATIENT',
          entity: 'PATIENT',
          entityId: id,
          details: JSON.stringify({ doctorId: existing.userId, updates: data }),
        },
      })
      .catch(() => {});

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/prescriptions', async (req: AuthRequest, res) => {
  try {
    const { doctorId, patientId, page = '1', limit = '20' } = req.query as {
      doctorId?: string;
      patientId?: string;
      page?: string;
      limit?: string;
    };
    const pageNum = Math.max(parseInt(page || '1', 10), 1);
    const take = Math.min(Math.max(parseInt(limit || '20', 10), 1), 200);
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (doctorId) where.userId = doctorId;
    if (patientId) where.patientId = patientId;

    auditSuperAdminPrismaBaseAccess(req, 'GET /prescriptions prismaBase');
    const [prescriptions, total] = await Promise.all([
      prismaBase.prescription.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          patient: { select: { id: true, name: true, regNo: true, phone: true } },
          user: { select: { id: true, name: true, email: true, clinicName: true } },
          items: true,
        },
      }),
      prismaBase.prescription.count({ where }),
    ]);

    res.json({ prescriptions, total, page: pageNum, limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/prescriptions/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    auditSuperAdminPrismaBaseAccess(req, 'PUT /prescriptions/:id prismaBase');
    const { diagnosis, chiefComplaint, examination, investigation, advice, followUpDate, vitals, items } = req.body as {
      diagnosis?: string;
      chiefComplaint?: string;
      examination?: string;
      investigation?: string;
      advice?: string;
      followUpDate?: string | null;
      vitals?: string;
      items?: Array<{
        drugName: string;
        genericName?: string;
        dosage: string;
        frequency: string;
        duration: string;
        beforeFood?: boolean;
        afterFood?: boolean;
        instructions?: string;
      }>;
    };

    const existing = await prismaBase.prescription.findUnique({
      where: { id },
      select: { id: true, userId: true, patientId: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const updateData: Record<string, unknown> = {};
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (chiefComplaint !== undefined) updateData.chiefComplaint = chiefComplaint;
    if (examination !== undefined) updateData.examination = examination;
    if (investigation !== undefined) updateData.investigation = investigation;
    if (advice !== undefined) updateData.advice = advice;
    if (vitals !== undefined) updateData.vitals = vitals;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;

    if (Array.isArray(items)) {
      await prismaBase.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      updateData.items = {
        create: items.map((item) => ({
          drugName: item.drugName,
          genericName: item.genericName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          beforeFood: Boolean(item.beforeFood),
          afterFood: item.afterFood === undefined ? true : Boolean(item.afterFood),
          instructions: item.instructions,
        })),
      };
    }

    const updated = await prismaBase.prescription.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, regNo: true, phone: true } },
        user: { select: { id: true, name: true, email: true, clinicName: true } },
        items: true,
      },
    });

    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'SUPER_ADMIN_UPDATE_PRESCRIPTION',
          entity: 'PRESCRIPTION',
          entityId: id,
          details: JSON.stringify({
            doctorId: existing.userId,
            patientId: existing.patientId,
            updatedFields: Object.keys(updateData),
          }),
        },
      })
      .catch(() => {});

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/demo/reset', requireCapability('system:demo:reset'), async (req: AuthRequest, res) => {
  try {
    const r = await resetAllDemoClinics();
    await prisma.activityLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'SUPER_ADMIN_DEMO_RESET',
          entity: 'CLINIC',
          entityId: 'demo',
          details: JSON.stringify({ clinicsReset: r.clinicsReset }),
        },
      })
      .catch(() => {});
    res.json({ ok: true, ...r });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Reset failed';
    res.status(500).json({ error: msg });
  }
});

router.patch('/clinics/:clinicId/plan-tier', async (req: AuthRequest, res) => {
  try {
    const tier = String((req.body as { planTier?: string })?.planTier ?? '').toUpperCase();
    if (!['STARTER', 'GROWTH', 'ENTERPRISE'].includes(tier)) {
      res.status(400).json({ error: 'planTier must be STARTER, GROWTH, or ENTERPRISE' });
      return;
    }
    const clinic = await prisma.clinic.update({
      where: { id: req.params.clinicId },
      data: { planTier: tier },
      select: { id: true, name: true, planTier: true },
    });
    res.json(clinic);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    res.status(500).json({ error: msg });
  }
});

router.put('/clinics/:clinicId/feature-flags/:featureKey', async (req: AuthRequest, res) => {
  try {
    const enabled = Boolean((req.body as { enabled?: boolean })?.enabled);
    const row = await prisma.clinicFeatureFlag.upsert({
      where: {
        clinicId_featureKey: { clinicId: req.params.clinicId, featureKey: req.params.featureKey },
      },
      create: {
        clinicId: req.params.clinicId,
        featureKey: req.params.featureKey,
        enabled,
      },
      update: { enabled },
    });
    res.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Update failed';
    res.status(500).json({ error: msg });
  }
});

router.get('/clinics/:clinicId/feature-flags', async (req: AuthRequest, res) => {
  try {
    const rows = await prisma.clinicFeatureFlag.findMany({
      where: { clinicId: req.params.clinicId },
      orderBy: { featureKey: 'asc' },
    });
    res.json({ flags: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Load failed';
    res.status(500).json({ error: msg });
  }
});

export default router;
