import { Router } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { blockTenantFromEmr, requireLabEmrAccess } from '../middleware/clinicalRbac.js';
import { parseUniversalToothNumber } from '../utils/fdiTooth.js';

const router = Router();

router.use(blockTenantFromEmr);
router.use(requireLabEmrAccess);

const clinicLabScope = (req: AuthRequest) => ({ patient: { clinicId: resolveBusinessClinicId(req) } });

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { patientId, status, workType, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { ...clinicLabScope(req) };
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

router.get('/pending', async (req: AuthRequest, res) => {
  try {
    const labOrders = await prisma.labOrder.findMany({
      where: {
        ...clinicLabScope(req),
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

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [pending, inProgress, ready, delivered] = await Promise.all([
      prisma.labOrder.count({ where: { ...clinicLabScope(req), status: 'PENDING' } }),
      prisma.labOrder.count({ where: { ...clinicLabScope(req), status: 'IN_PROGRESS' } }),
      prisma.labOrder.count({ where: { ...clinicLabScope(req), status: 'READY' } }),
      prisma.labOrder.count({ where: { ...clinicLabScope(req), status: 'DELIVERED' } }),
    ]);

    res.json({ pending, inProgress, ready, delivered });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const labOrder = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
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

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { patientId, labName, expectedDate, workType, description, toothNumber, shade, cost, notes } = req.body;

    if (toothNumber !== undefined && toothNumber !== null && String(toothNumber).trim() !== '') {
      const n = parseUniversalToothNumber(toothNumber);
      if (n === null) {
        res.status(400).json({ error: 'toothNumber must be between 1 and 32 when provided' });
        return;
      }
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: resolveBusinessClinicId(req) },
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

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { labName, expectedDate, deliveryDate, workType, description, toothNumber, shade, status, cost, notes } = req.body;

    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
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

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
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

router.post('/:id/send-to-lab', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'SENT_TO_LAB' },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-ready', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'READY' },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-delivered', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    const labOrder = await prisma.labOrder.update({
      where: { id: req.params.id },
      data: { status: 'DELIVERED', deliveryDate: new Date() },
    });
    res.json(labOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/mark-fitted', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.labOrder.findFirst({
      where: { id: req.params.id, ...clinicLabScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
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
