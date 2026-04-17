import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [
      totalPatients,
      newPatientsThisMonth,
      todayAppointments,
      upcomingAppointments,
      monthlyRevenue,
      pendingDue,
      pendingLabOrders,
      prescriptionsThisMonth,
      pendingInvoicesCount,
      overdueInvoicesCount,
    ] = await Promise.all([
      prisma.patient.count({ where: { userId: req.user!.id } }),
      prisma.patient.count({
        where: { userId: req.user!.id, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.appointment.count({
        where: { userId: req.user!.id, date: { gte: today, lt: tomorrow } },
      }),
      prisma.appointment.count({
        where: {
          userId: req.user!.id,
          date: { gte: today },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          userId: req.user!.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { paid: true },
      }),
      prisma.invoice.aggregate({
        where: {
          userId: req.user!.id,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
        _sum: { due: true },
      }),
      prisma.labOrder.count({
        where: {
          userId: req.user!.id,
          status: { in: ['PENDING', 'SENT_TO_LAB', 'IN_PROGRESS', 'READY'] },
        },
      }),
      prisma.prescription.count({
        where: {
          userId: req.user!.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.invoice.count({
        where: {
          userId: req.user!.id,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
      }),
      prisma.invoice.count({
        where: {
          userId: req.user!.id,
          due: { gt: 0 },
          status: { not: 'PAID' },
          dueDate: { not: null, lt: today },
        },
      }),
    ]);

    res.json({
      totalPatients,
      newPatientsThisMonth,
      todayAppointments,
      upcomingAppointments,
      monthlyRevenue: monthlyRevenue._sum.paid || 0,
      pendingDue: pendingDue._sum.due || 0,
      pendingLabOrders,
      prescriptionsThisMonth,
      pendingInvoicesCount,
      overdueInvoicesCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/today', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [appointments, prescriptions, invoices] = await Promise.all([
      prisma.appointment.findMany({
        where: { userId: req.user!.id, date: { gte: today, lt: tomorrow } },
        orderBy: { time: 'asc' },
        include: { patient: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.prescription.findMany({
        where: { userId: req.user!.id, date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { id: true, name: true } } },
      }),
      prisma.invoice.findMany({
        where: { userId: req.user!.id, date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({ appointments, prescriptions, invoices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recent-patients', authenticate, async (req: AuthRequest, res) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        age: true,
        gender: true,
        createdAt: true,
        _count: { select: { appointments: true, prescriptions: true } },
      },
    });

    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/revenue-chart', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const today = new Date();
    
    const data: { date: string; revenue: number }[] = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const revenue = await prisma.payment.aggregate({
          where: {
            invoice: { userId: req.user!.id },
            date: { gte: date, lt: nextDay },
          },
          _sum: { amount: true },
        });

        data.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: Number(revenue._sum.amount) || 0,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

        const revenue = await prisma.payment.aggregate({
          where: {
            invoice: { userId: req.user!.id },
            date: { gte: date, lt: nextMonth },
          },
          _sum: { amount: true },
        });

        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue: Number(revenue._sum.amount) || 0,
        });
      }
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/appointment-chart', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const data: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await prisma.appointment.count({
        where: {
          userId: req.user!.id,
          date: { gte: date, lt: nextDay },
        },
      });

      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/treatment-stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const treatments = await prisma.treatmentPlan.groupBy({
      by: ['procedure'],
      where: { patient: { userId: req.user!.id } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    res.json(treatments.map(t => ({
      procedure: t.procedure,
      count: t._count.id,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
