import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { applyVerifiedSubscriptionPayment } from '../services/subscriptionPaymentApply.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

const patchBodySchema = z.object({
  status: z.enum(['CONTACTED', 'PAID', 'REJECTED']),
});

router.get(
  '/',
  asyncRoute('admin.subscriptionPayments.list', async (req: AuthRequest, res: Response) => {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '100'), 10) || 100));
    const rows = await prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        clinic: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ success: true, data: rows });
  })
);

router.patch(
  '/:id',
  validateBody(patchBodySchema),
  asyncRoute('admin.subscriptionPayments.patch', async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const { status } = req.body as z.infer<typeof patchBodySchema>;

    const existing = await prisma.subscriptionPayment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Payment request not found' });
      return;
    }

    await prisma.subscriptionPayment.update({
      where: { id },
      data: { status },
    });

    if (status === 'PAID') {
      const applied = await applyVerifiedSubscriptionPayment(id);
      if (!applied.ok) {
        res.status(400).json({ success: false, error: applied.error });
        return;
      }
    }

    const row = await prisma.subscriptionPayment.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: row });
  })
);

export default router;
