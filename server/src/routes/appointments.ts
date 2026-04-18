import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { blockTenantFromEmr, requireAppointmentsEmrAccess } from '../middleware/clinicalRbac.js';
import { appointmentWindow } from '../utils/appointmentTimeRange.js';
import { assertNoAppointmentOverlap, AppointmentConflictError } from '../services/appointmentConflictService.js';

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
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
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
    const { start, end } = appointmentWindow(aptDate, time, dur);

    const appointment = await prisma.$transaction(
      async (tx) => {
        const patient = await tx.patient.findFirst({
          where: { id: patientId, clinicId },
        });

        if (!patient) {
          throw Object.assign(new Error('PATIENT_NOT_FOUND'), { code: 404 });
        }

        const practitioner = await tx.user.findFirst({
          where: { id: doctorUserId, clinicId },
        });
        if (!practitioner) {
          throw Object.assign(new Error('DOCTOR_NOT_IN_CLINIC'), { code: 400 });
        }

        await assertNoAppointmentOverlap(tx, {
          clinicId,
          doctorUserId,
          chairId: chairId ?? null,
          start,
          end,
        });

        return tx.appointment.create({
          data: {
            patientId,
            userId: doctorUserId,
            clinicId,
            chairId: chairId ? String(chairId).trim() || null : null,
            date: aptDate,
            time,
            duration: dur,
            type,
            notes,
          },
          include: {
            patient: { select: { id: true, name: true, phone: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    res.status(201).json(appointment);
  } catch (error: unknown) {
    if (error instanceof AppointmentConflictError) {
      res.status(409).json({ error: error.message });
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
    const nextDate = date ? new Date(date) : existing.date;
    const nextTime = time !== undefined ? time : existing.time;
    const nextDur = duration !== undefined ? duration : existing.duration;
    const nextChair = chairId !== undefined ? (chairId ? String(chairId).trim() || null : null) : existing.chairId;
    const { start, end } = appointmentWindow(nextDate, nextTime, nextDur);

    const appointment = await prisma.$transaction(
      async (tx) => {
        if (bodyUserId !== undefined || bodyDoctorId !== undefined) {
          const practitioner = await tx.user.findFirst({
            where: { id: nextDoctorId, clinicId },
          });
          if (!practitioner) {
            throw Object.assign(new Error('DOCTOR_NOT_IN_CLINIC'), { code: 400 });
          }
        }
        await assertNoAppointmentOverlap(tx, {
          clinicId,
          doctorUserId: nextDoctorId,
          chairId: nextChair,
          start,
          end,
          excludeAppointmentId: existing.id,
        });

        return tx.appointment.update({
          where: { id: existing.id },
          data: {
            date: date ? new Date(date) : undefined,
            time,
            duration,
            type,
            status,
            notes,
            ...(bodyUserId !== undefined || bodyDoctorId !== undefined ? { userId: nextDoctorId } : {}),
            ...(chairId !== undefined ? { chairId: nextChair } : {}),
          },
          include: {
            patient: { select: { id: true, name: true, phone: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    res.json(appointment);
  } catch (error: unknown) {
    if (error instanceof AppointmentConflictError) {
      res.status(409).json({ error: error.message });
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
    const existing = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Appointment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
    });
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
    });
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/confirm', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: apptWhere(req, { id: req.params.id }) as any,
    });
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' },
    });
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
