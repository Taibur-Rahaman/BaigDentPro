import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { activityTimelineQuerySchema } from '../validation/schemas.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { blockReceptionist } from '../security/blockReceptionistRoutes.js';

const router = Router();

router.use(requireRole('CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'));
router.use(blockReceptionist);
router.use(requireCapability('dpms:access'));

router.get(
  '/timeline',
  requireCapability('dpms:analytics:advanced'),
  asyncRoute('activity.timeline', async (req: AuthRequest, res: Response) => {
    const parsed = activityTimelineQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid query', details: parsed.error.flatten() });
      return;
    }
    const { userId, from, to, page, limit } = parsed.data;

    const clinicId = req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId;
    if (!clinicId) {
      res.status(403).json({ success: false, error: 'No clinic context' });
      return;
    }

    const role = req.user!.role;
    let filterUserId = userId;
    if (role === 'DOCTOR' || role === 'RECEPTIONIST') {
      filterUserId = req.user!.id;
    }

    const where: {
      clinicId: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { clinicId };

    if (filterUserId) {
      where.userId = filterUserId;
    }

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) createdAt.lte = d;
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          clinicId: true,
          action: true,
          entity: true,
          entityId: true,
          meta: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page, limit },
    });
  })
);

export default router;
