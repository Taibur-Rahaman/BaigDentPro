/**
 * @domain CLINICAL
 * Patient EMR only — invoice rows are loaded via `/api/invoices?patientId=` (finance domain).
 */
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sanitizeMedicalHistoryBody } from '../utils/medicalHistorySanitize.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import {
  blockTenantFromEmr,
  blockReceptionistTreatmentPlanMutations,
  requirePatientsEmrAccess,
} from '../middleware/clinicalRbac.js';
import { queryPatientTimeline } from '../services/patientTimelineQuery.js';
import { assertUniversalToothNumber, FdiValidationError, parseUniversalToothNumber } from '../utils/fdiTooth.js';
import {
  workflowApplyTreatmentPlanPut,
  InvalidStateTransitionError,
} from '../domains/workflow/appointmentWorkflowService.js';

const router = Router();

router.use(blockTenantFromEmr);
router.use(requirePatientsEmrAccess);
router.use(blockReceptionistTreatmentPlanMutations);

function patientWhere(req: AuthRequest, extra: Prisma.PatientWhereInput = {}): Prisma.PatientWhereInput {
  return { clinicId: resolveBusinessClinicId(req), ...extra };
}

type PatientListParams = {
  search?: string;
  page?: string;
  limit?: string;
};

router.get('/', async (req: AuthRequest, res) => {
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

    const where: Prisma.PatientWhereInput = patientWhere(req);

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
            select: { appointments: true, prescriptions: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ patients, total, page: pageNum, limit: take });
  } catch (error) {
    console.error('Patients list error:', error);
    res.status(500).json({ error: 'Could not load patients' });
  }
});

/** Unified read projection (clinical + scheduling + finance facts) — no writes. */
router.get('/:id/timeline', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const p = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
      select: { id: true },
    });
    if (!p) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const events = await queryPatientTimeline(req.params.id, clinicId);
    res.json({ events });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Could not load timeline';
    res.status(500).json({ error: msg });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
      include: {
        medicalHistory: true,
        dentalCharts: true,
        treatmentPlans: { orderBy: { createdAt: 'desc' } },
        treatmentRecords: { orderBy: { date: 'desc' } },
        appointments: { orderBy: { date: 'desc' }, take: 10 },
        prescriptions: { orderBy: { date: 'desc' }, take: 10 },
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

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, phone, age, gender, email, address, bloodGroup, occupation, referredBy, phoneType, notes } = req.body;

    const clinicId = resolveBusinessClinicId(req);
    const patientCount = await prisma.patient.count({ where: { clinicId } });
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
        clinicId,
        userId: req.user!.id,
      },
      include: { medicalHistory: true },
    });

    res.status(201).json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, phone, age, gender, email, address, bloodGroup, occupation, referredBy, phoneType, notes, image } = req.body;

    const existing = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
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

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
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

router.put('/:id/medical-history', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
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

router.put('/:id/dental-chart', async (req: AuthRequest, res) => {
  try {
    const { toothNumber, condition, notes, treatment, treatmentDate, surfaces } = req.body as Record<
      string,
      unknown
    >;

    let tooth: number;
    try {
      tooth = assertUniversalToothNumber(toothNumber);
    } catch (e) {
      if (e instanceof FdiValidationError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }

    const existing = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    let surfacesJson: Prisma.InputJsonValue = {};
    if (surfaces !== undefined && surfaces !== null) {
      if (typeof surfaces === 'object' && !Array.isArray(surfaces)) {
        surfacesJson = surfaces as Prisma.InputJsonValue;
      }
    }

    const conditionStr = typeof condition === 'string' ? condition : String(condition ?? '');
    const notesVal = notes === undefined || notes === null ? null : String(notes);
    const treatmentVal = treatment === undefined || treatment === null ? null : String(treatment);
    const treatmentDateVal =
      treatmentDate === undefined || treatmentDate === null ? null : new Date(String(treatmentDate));

    const chart = await prisma.dentalChart.upsert({
      where: {
        patientId_toothNumber: { patientId: req.params.id, toothNumber: tooth },
      },
      create: {
        patientId: req.params.id,
        toothNumber: tooth,
        condition: conditionStr,
        surfaces: surfacesJson,
        notes: notesVal,
        treatment: treatmentVal,
        treatmentDate: treatmentDateVal,
      },
      update: {
        condition: conditionStr,
        ...(surfaces !== undefined ? { surfaces: surfacesJson } : {}),
        notes: notesVal,
        treatment: treatmentVal,
        treatmentDate: treatmentDateVal,
      },
    });

    res.json(chart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/treatment-plans', async (req: AuthRequest, res) => {
  try {
    const { toothNumber, diagnosis, procedure, cost, cc, cf, investigation, status } = req.body;

    let toothStr: string | null = null;
    if (toothNumber !== undefined && toothNumber !== null && String(toothNumber).trim() !== '') {
      const n = parseUniversalToothNumber(toothNumber);
      if (n === null) {
        res.status(400).json({ error: 'toothNumber must be a universal tooth index between 1 and 32 when provided' });
        return;
      }
      toothStr = String(n);
    }

    const existing = await prisma.patient.findFirst({
      where: patientWhere(req, { id: req.params.id }),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId: req.params.id,
        toothNumber: toothStr,
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

router.put('/:id/treatment-plans/:planId', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const plan = await workflowApplyTreatmentPlanPut({
      clinicId,
      patientId: req.params.id,
      planId: req.params.planId,
      patch: req.body as Record<string, unknown>,
    });

    res.json(plan);
  } catch (error: unknown) {
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Treatment plan not found' });
      return;
    }
    const msg = error instanceof Error ? error.message : 'Update failed';
    res.status(500).json({ error: msg });
  }
});

router.delete('/:id/treatment-plans/:planId', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.treatmentPlan.findFirst({
      where: {
        id: req.params.planId,
        patientId: req.params.id,
        patient: patientWhere(req),
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Treatment plan not found' });
    }
    await prisma.treatmentPlan.delete({ where: { id: existing.id } });
    res.json({ message: 'Treatment plan deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/treatment-records', async (req: AuthRequest, res) => {
  try {
    const { treatmentDone, toothNumber, cost, paid, due, notes, doctorSignature, date } = req.body;

    let toothStr: string | null = null;
    if (toothNumber !== undefined && toothNumber !== null && String(toothNumber).trim() !== '') {
      const n = parseUniversalToothNumber(toothNumber);
      if (n === null) {
        res.status(400).json({ error: 'toothNumber must be between 1 and 32 when provided' });
        return;
      }
      toothStr = String(n);
    }

    const p = await prisma.patient.findFirst({ where: patientWhere(req, { id: req.params.id }) });
    if (!p) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const record = await prisma.treatmentRecord.create({
      data: {
        patientId: req.params.id,
        date: date ? new Date(date) : new Date(),
        treatmentDone,
        toothNumber: toothStr,
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

router.put('/:id/treatment-records/:recordId', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.treatmentRecord.findFirst({
      where: {
        id: req.params.recordId,
        patientId: req.params.id,
        patient: patientWhere(req),
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Treatment record not found' });
    }

    const { treatmentDone, toothNumber, cost, paid, due, notes, doctorSignature, date } = req.body;

    if (typeof treatmentDone !== 'string' || !treatmentDone.trim()) {
      res.status(400).json({ error: 'treatmentDone is required' });
      return;
    }

    let toothStr: string | null = existing.toothNumber;
    if (toothNumber !== undefined) {
      if (toothNumber === null || String(toothNumber).trim() === '') {
        toothStr = null;
      } else {
        const n = parseUniversalToothNumber(toothNumber);
        if (n === null) {
          res.status(400).json({ error: 'toothNumber must be between 1 and 32 when provided' });
          return;
        }
        toothStr = String(n);
      }
    }

    const record = await prisma.treatmentRecord.update({
      where: { id: existing.id },
      data: {
        treatmentDone,
        date: date ? new Date(date) : undefined,
        cost: cost !== undefined ? parseFloat(String(cost)) || 0 : undefined,
        paid: paid !== undefined ? parseFloat(String(paid)) || 0 : undefined,
        due: due !== undefined ? parseFloat(String(due)) || 0 : undefined,
        notes: notes === undefined ? undefined : notes,
        doctorSignature: doctorSignature === undefined ? undefined : doctorSignature,
        toothNumber: toothNumber === undefined ? undefined : toothStr,
      },
    });

    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/treatment-records/:recordId', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.treatmentRecord.findFirst({
      where: {
        id: req.params.recordId,
        patientId: req.params.id,
        patient: patientWhere(req),
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Treatment record not found' });
    }
    await prisma.treatmentRecord.delete({ where: { id: existing.id } });
    res.json({ message: 'Treatment record deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/consent', async (req: AuthRequest, res) => {
  try {
    const { consentType, consentText, signatureName, agreed } = req.body;

    const p = await prisma.patient.findFirst({ where: patientWhere(req, { id: req.params.id }) });
    if (!p) {
      return res.status(404).json({ error: 'Patient not found' });
    }

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
