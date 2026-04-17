 
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sanitizeMedicalHistoryBody } from '../utils/medicalHistorySanitize.js';

const router = Router();

type PatientListParams = {
  search?: string;
  page?: string;
  limit?: string;
};

type CreatePatientInput = {
  name: string;
  phone: string;
  age?: number;
  gender?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  occupation?: string;
  referredBy?: string;
  phoneType?: string;
  notes?: string;
};
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const params: PatientListParams = {
      search: req.query.search as string,
      page: (req.query.page as string) || '1',
      limit: (req.query.limit as string) || '50',
    };

    const pageNum = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(params.limit ?? '50', 10) || 50));
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const where: Prisma.PatientWhereInput = {
      userId: req.user!.id,
    };

    if (params.search) {
      const s = params.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { regNo: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          medicalHistory: true,
          _count: {
            select: { appointments: true, prescriptions: true, invoices: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ patients, total, page: pageNum, limit: take });
  } catch (error) {
    console.error('Patients list error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        medicalHistory: true,
        dentalCharts: true,
        treatmentPlans: { orderBy: { createdAt: 'desc' } },
        treatmentRecords: { orderBy: { date: 'desc' } },
        appointments: { orderBy: { date: 'desc' }, take: 10 },
        prescriptions: { orderBy: { date: 'desc' }, take: 10 },
        invoices: { orderBy: { date: 'desc' }, take: 10, include: { items: true } },
        labOrders: { orderBy: { orderDate: 'desc' }, take: 10 },
        consents: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, age, gender, email, address, bloodGroup, occupation, referredBy, phoneType, notes } = req.body;

    const patientCount = await prisma.patient.count({ where: { userId: req.user!.id } });
    const regNo = `P${String(patientCount + 1).padStart(5, '0')}`;

    const patient = await prisma.patient.create({
      data: {
        regNo,
        name,
        phone,
        age: age ? parseInt(age) : null,
        gender,
        email,
        address,
        bloodGroup,
        occupation,
        referredBy,
        phoneType,
        notes,
        userId: req.user!.id,
      },
      include: { medicalHistory: true },
    });

    res.status(201).json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, age, gender, email, address, bloodGroup, occupation, referredBy, phoneType, notes, image } = req.body;

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        name,
        phone,
        age: age ? parseInt(age) : null,
        gender,
        email,
        address,
        bloodGroup,
        occupation,
        referredBy,
        phoneType,
        notes,
        image,
      },
      include: { medicalHistory: true },
    });

    res.json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.patient.delete({ where: { id: req.params.id } });
    res.json({ message: 'Patient deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/medical-history', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const safe = sanitizeMedicalHistoryBody(req.body);
    const medicalHistory = await prisma.medicalHistory.upsert({
      where: { patientId: req.params.id },
      create: { patientId: req.params.id, ...safe },
      update: safe,
    });

    res.json(medicalHistory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/dental-chart', authenticate, async (req: AuthRequest, res) => {
  try {
    const { toothNumber, condition, notes, treatment, treatmentDate } = req.body;

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const chart = await prisma.dentalChart.upsert({
      where: {
        patientId_toothNumber: { patientId: req.params.id, toothNumber },
      },
      create: {
        patientId: req.params.id,
        toothNumber,
        condition,
        notes,
        treatment,
        treatmentDate: treatmentDate ? new Date(treatmentDate) : null,
      },
      update: { condition, notes, treatment, treatmentDate: treatmentDate ? new Date(treatmentDate) : null },
    });

    res.json(chart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/treatment-plans', authenticate, async (req: AuthRequest, res) => {
  try {
    const { toothNumber, diagnosis, procedure, cost, cc, cf, investigation, status } = req.body;

    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId: req.params.id,
        toothNumber,
        diagnosis,
        procedure,
        cost: parseFloat(cost) || 0,
        cc,
        cf,
        investigation,
        status: status || 'NOT_STARTED',
      },
    });

    res.status(201).json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/treatment-plans/:planId', authenticate, async (req: AuthRequest, res) => {
  try {
    const plan = await prisma.treatmentPlan.update({
      where: { id: req.params.planId },
      data: req.body,
    });

    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/treatment-plans/:planId', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.treatmentPlan.delete({ where: { id: req.params.planId } });
    res.json({ message: 'Treatment plan deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/treatment-records', authenticate, async (req: AuthRequest, res) => {
  try {
    const { treatmentDone, toothNumber, cost, paid, due, notes, doctorSignature, date } = req.body;

    const record = await prisma.treatmentRecord.create({
      data: {
        patientId: req.params.id,
        date: date ? new Date(date) : new Date(),
        treatmentDone,
        toothNumber,
        cost: parseFloat(cost) || 0,
        paid: parseFloat(paid) || 0,
        due: parseFloat(due) || 0,
        notes,
        doctorSignature,
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/consent', authenticate, async (req: AuthRequest, res) => {
  try {
    const { consentType, consentText, signatureName, agreed } = req.body;

    const consent = await prisma.patientConsent.create({
      data: {
        patientId: req.params.id,
        consentType,
        consentText,
        signatureName,
        signatureDate: new Date(),
        agreed,
      },
    });

    res.status(201).json(consent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
