import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { assertPasswordAcceptable } from '../utils/passwordPolicy.js';

const router = Router();

const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN']);

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

router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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
      if (filterClinicId) {
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
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: pageNum, limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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

    const user = await prisma.user.create({
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

    res.status(201).json(user);
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('Password') || msg.includes('characters')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

router.put('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Super admin: list clinics for assigning new staff */
router.get('/clinics', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Platform admin only' });
    }
    const clinics = await prisma.clinic.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, email: true },
      take: 200,
    });
    res.json({ clinics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
