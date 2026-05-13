import { Router } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { blockTenantFromEmr, requireAppointmentsEmrAccess } from '../middleware/clinicalRbac.js';
import {
  workflowCreateAppointment,
  workflowUpdateAppointment,
  workflowSetAppointmentStatus,
  workflowCompleteAppointment,
  workflowDeleteAppointment,
  suggestNextAvailableSlotAfterConflict,
  AppointmentConflictError,
  InvalidStateTransitionError,
} from '../domains/workflow/appointmentWorkflowService.js';

const router = Router();

router.use(blockTenantFromEmr);
router.use(requireAppointmentsEmrAccess);

function apptWhere(req: AuthRequest, extra: Record<string, unknown> = {}) {
  const clinicId = resolveBusinessClinicId(req);
  return { clinicId, ...extra };
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate, status, patientId } = req.query;

    const where: Record<string, unknown> = apptWhere(req);

    if (date) {
      const d = new Date(date as string);
      where.date = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const appointments = await prisma.appointment.findMany({
      where: where as any,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        patient: {
          select: { id: true, name: true, phone: true, age: true, gender: true },
        },
      },
    });

    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/today', async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        ...apptWhere(req),
        date: { gte: startOfDay, lte: endOfDay },
      } as any,
      orderBy: { time: 'asc' },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, age: true, gender: true },
        },
      },
    });

    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/upcoming', async (req: AuthRequest, res) => {
  try {
    const { limit = '10' } = req.query;

    const appointments = await prisma.appointment.findMany({
      where: {
        ...apptWhere(req),
        date: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      } as any,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: parseInt(limit as string),
      include: {
        patient: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/calendar', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth();
    const y = parseInt(year as string) || new Date().getFullYear();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const appointments = await prisma.appointment.findMany({
      where: {
        ...apptWhere(req),
        date: { gte: startDate, lte: endDate },
      } as any,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    const calendar: Record<string, typeof appointments> = {};
    appointments.forEach((apt) => {
      const dateKey = apt.date.toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(apt);
    });

    res.json(calendar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/waitlist', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const rows = await prisma.appointmentWaitlistEntry.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'asc' },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
    res.json(rows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load waitlist';
    res.status(500).json({ error: msg });
  }
});

router.post('/waitlist', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const body = req.body as Record<string, unknown>;
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
    if (!patientId) {
      res.status(400).json({ error: 'patientId required' });
      return;
    }
    const p = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!p) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    const preferredRaw = body.preferredDate;
    const durRaw = body.duration;
    const duration =
      typeof durRaw === 'number' && Number.isFinite(durRaw)
        ? durRaw
        : parseInt(String(durRaw ?? '30'), 10) || 30;
    const row = await prisma.appointmentWaitlistEntry.create({
      data: {
        clinicId,
        patientId,
        preferredDate:
          preferredRaw !== undefined && preferredRaw !== null && String(preferredRaw).trim() !== ''
            ? new Date(String(preferredRaw))
            : null,
        duration,
        notes: body.notes === undefined || body.notes === null ? null : String(body.notes),
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
    res.status(201).json(row);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to add waitlist entry';
    res.status(500).json({ error: msg });
  }
});

router.delete('/waitlist/:entryId', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const existing = await prisma.appointmentWaitlistEntry.findFirst({
      where: { id: req.params.entryId, clinicId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await prisma.appointmentWaitlistEntry.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to remove waitlist entry';
    res.status(500).json({ error: msg });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
      include: {
        patient: true,
        user: { select: { name: true, clinicName: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { patientId, date, time, duration, type, notes, chairId, userId: bodyUserId, doctorId: bodyDoctorId } =
      req.body as {
        patientId: string;
        date: string;
        time: string;
        duration?: number;
        type?: string;
        notes?: string;
        chairId?: string | null;
        userId?: string;
        doctorId?: string;
      };
    const clinicId = resolveBusinessClinicId(req);
    const doctorUserId = String(bodyUserId || bodyDoctorId || req.user!.id).trim();
    const aptDate = new Date(date);
    const dur = duration || 30;

    const appointment = await workflowCreateAppointment({
      clinicId,
      patientId,
      doctorUserId,
      date: aptDate,
      time,
      duration: dur,
      type,
      notes,
      chairId: chairId ?? null,
    });

    res.status(201).json(appointment);
  } catch (error: unknown) {
    if (error instanceof AppointmentConflictError) {
      const clinicId = resolveBusinessClinicId(req);
      const body = req.body as {
        patientId?: string;
        date?: string;
        time?: string;
        duration?: number;
        chairId?: string | null;
        userId?: string;
        doctorId?: string;
      };
      const doctorUserId = String(body.userId || body.doctorId || req.user!.id).trim();
      const aptDate = body.date ? new Date(body.date) : new Date();
      const dur = body.duration || 30;
      const chairId = body.chairId ?? null;
      let suggestedSlot: { date: string; time: string } | null = null;
      try {
        suggestedSlot = await suggestNextAvailableSlotAfterConflict({
          clinicId,
          doctorUserId,
          chairId,
          preferredDate: aptDate,
          duration: dur,
        });
      } catch {
        suggestedSlot = null;
      }
      res.status(409).json({
        error: error.message,
        ...(suggestedSlot ? { suggestedSlot } : {}),
      });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    if (err?.code === 400) {
      res.status(400).json({ error: 'Selected practitioner is not in this clinic' });
      return;
    }
    console.error('Appointment create error:', error);
    res.status(500).json({ error: err?.message || 'Failed to create appointment' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { date, time, duration, type, status, notes, chairId, userId: bodyUserId, doctorId: bodyDoctorId } =
      req.body as {
        date?: string;
        time?: string;
        duration?: number;
        type?: string;
        status?: string;
        notes?: string;
        chairId?: string | null;
        userId?: string;
        doctorId?: string;
      };

    const existing = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const clinicId = resolveBusinessClinicId(req);
    const nextDoctorId =
      bodyUserId !== undefined || bodyDoctorId !== undefined
        ? String(bodyUserId || bodyDoctorId || '').trim()
        : existing.userId;
    const appointment = await workflowUpdateAppointment({
      clinicId,
      appointmentId: existing.id,
      existing: {
        id: existing.id,
        userId: existing.userId,
        date: existing.date,
        time: existing.time,
        duration: existing.duration,
        chairId: existing.chairId,
        status: existing.status,
      },
      date,
      time,
      duration,
      type,
      status,
      notes,
      chairId,
      nextDoctorId,
      doctorChanged: bodyUserId !== undefined || bodyDoctorId !== undefined,
    });

    res.json(appointment);
  } catch (error: unknown) {
    if (error instanceof AppointmentConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 400) {
      res.status(400).json({ error: 'Selected practitioner is not in this clinic' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to update appointment' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    await workflowDeleteAppointment({ clinicId, appointmentId: req.params.id });
    res.json({ message: 'Appointment deleted' });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to delete appointment' });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const appointment = await workflowSetAppointmentStatus({
      clinicId,
      appointmentId: req.params.id,
      status: 'CANCELLED',
    });
    res.json(appointment);
  } catch (error: unknown) {
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to cancel appointment' });
  }
});

router.post('/:id/complete', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const appointment = await workflowCompleteAppointment({
      clinicId,
      appointmentId: req.params.id,
    });
    res.json(appointment);
  } catch (error: unknown) {
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to complete appointment' });
  }
});

router.post('/:id/confirm', async (req: AuthRequest, res) => {
  try {
    const clinicId = resolveBusinessClinicId(req);
    const appointment = await workflowSetAppointmentStatus({
      clinicId,
      appointmentId: req.params.id,
      status: 'CONFIRMED',
    });
    res.json(appointment);
  } catch (error: unknown) {
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const err = error as { code?: number; message?: string };
    if (err?.code === 404) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to confirm appointment' });
  }
});

export default router;
