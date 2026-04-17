import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, startDate, endDate, status, patientId } = req.query;

    const where: any = { userId: req.user!.id };

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
      where,
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

router.get('/today', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
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

router.get('/upcoming', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = '10' } = req.query;

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
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

router.get('/calendar', authenticate, async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth();
    const y = parseInt(year as string) || new Date().getFullYear();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startDate, lte: endDate },
      },
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

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
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

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { patientId, date, time, duration, type, notes } = req.body;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, userId: req.user!.id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        userId: req.user!.id,
        date: new Date(date),
        time,
        duration: duration || 30,
        type,
        notes,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, time, duration, type, status, notes } = req.body;

    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        time,
        duration,
        type,
        status,
        notes,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
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

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/confirm', authenticate, async (req: AuthRequest, res) => {
  try {
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
