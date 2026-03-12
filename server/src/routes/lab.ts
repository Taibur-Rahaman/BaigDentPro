import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, status, workType, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId: req.user!.id };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (workType) where.workType = workType;

    const [labOrders, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { orderDate: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.labOrder.count({ where }),
    ]);

    res.json({ labOrders, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pending', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrders = await prisma.labOrder.findMany({
      where: {
        userId: req.user!.id,
        status: { in: ['PENDING', 'SENT_TO_LAB', 'IN_PROGRESS'] },
      },
      orderBy: { expectedDate: 'asc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json(labOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const [pending, inProgress, ready, delivered] = await Promise.all([
      prisma.labOrder.count({ where: { userId: req.user!.id, status: 'PENDING' } }),
      prisma.labOrder.count({ where: { userId: req.user!.id, status: 'IN_PROGRESS' } }),
      prisma.labOrder.count({ where: { userId: req.user!.id, status: 'READY' } }),
      prisma.labOrder.count({ where: { userId: req.user!.id, status: 'DELIVERED' } }),
    ]);

    res.json({ pending, inProgress, ready, delivered });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { patient: true },
    });

    if (!labOrder) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, labName, expectedDate, workType, description, toothNumber, shade, cost, notes } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, userId: req.user!.id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const labOrder = await prisma.labOrder.create({
      data: {
        patientId,
        userId: req.user!.id,
        labName,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        workType,
        description,
        toothNumber,
        shade,
        cost: cost ? parseFloat(cost) : null,
        notes,
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    res.status(201).json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { labName, expectedDate, deliveryDate, workType, description, toothNumber, shade, status, cost, notes } = req.body;

    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: {
        labName,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        workType,
        description,
        toothNumber,
        shade,
        status,
        cost: cost ? parseFloat(cost) : undefined,
        notes,
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    await prisma.labOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lab order deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-to-lab', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'SENT_TO_LAB' },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-ready', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'READY' },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-delivered', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'DELIVERED', deliveryDate: new Date() },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-fitted', authenticate, async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'FITTED' },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
