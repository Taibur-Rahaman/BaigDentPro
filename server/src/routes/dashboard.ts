import { Router } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveBusinessClinicId } from '../utils/requestClinic.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { rbacGuardBuilder } from '../security/rbacGuardBuilder.js';

const router = Router();

/**
 * Router-level role gate (replaces a router-level `requireCapability('dpms:access')`
 * which silently 403'd entire clinics whenever `patient_management` product feature
 * was disabled via override). Per-endpoint capability checks remain on analytics
 * endpoints below. Other DPMS routers (patients, appointments, ...) gate on the same
 * role surface via clinical-rbac middlewares, so this matches existing convention.
 */
const DASHBOARD_ROLES: readonly string[] = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'CLINIC_OWNER',
  'DOCTOR',
  'RECEPTIONIST',
  'LAB_TECH',
  'DENTAL_ASSISTANT',
];

router.use(...rbacGuardBuilder({ roles: DASHBOARD_ROLES }));

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const invScope = { clinicId: cid };
    const apptScope = { clinicId: cid };
    const rxScope = { patient: { clinicId: cid } };
    const labScope = { patient: { clinicId: cid } };

    // Sequential `$transaction` queries avoid connection pool stalls with Supabase PgBouncer + `connection_limit=1`.
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
    ] = await prisma.$transaction([
      prisma.patient.count({ where: { clinicId: cid } }),
      prisma.patient.count({
        where: { clinicId: cid, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.appointment.count({
        where: { ...apptScope, date: { gte: today, lt: tomorrow } },
      }),
      prisma.appointment.count({
        where: {
          ...apptScope,
          date: { gte: today },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          ...invScope,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { paid: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...invScope,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
        _sum: { due: true },
      }),
      prisma.labOrder.count({
        where: {
          ...labScope,
          status: { in: ['PENDING', 'SENT_TO_LAB', 'IN_PROGRESS', 'READY'] },
        },
      }),
      prisma.prescription.count({
        where: {
          ...rxScope,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.invoice.count({
        where: {
          ...invScope,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
      }),
      prisma.invoice.count({
        where: {
          ...invScope,
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

router.get('/today', async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invScope = { clinicId: cid };
    const apptScope = { clinicId: cid };
    const rxScope = { patient: { clinicId: cid } };

    const [appointments, prescriptions, invoices] = await prisma.$transaction([
      prisma.appointment.findMany({
        where: { ...apptScope, date: { gte: today, lt: tomorrow } },
        orderBy: { time: 'asc' },
        include: { patient: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.prescription.findMany({
        where: { ...rxScope, date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { id: true, name: true } } },
      }),
      prisma.invoice.findMany({
        where: { ...invScope, date: { gte: today, lt: tomorrow } },
        include: { patient: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({ appointments, prescriptions, invoices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recent-patients', async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const patients = await prisma.patient.findMany({
      where: { clinicId: cid },
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

router.get('/revenue-chart', requireCapability('dpms:analytics:advanced'), async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const { period = 'monthly' } = req.query;
    const today = new Date();

    const data: { date: string; revenue: number }[] = [];
    const payScope = { invoice: { clinicId: cid } };

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const revenue = await prisma.payment.aggregate({
          where: {
            ...payScope,
            paymentStatus: 'VERIFIED',
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
            ...payScope,
            paymentStatus: 'VERIFIED',
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

router.get('/appointment-chart', requireCapability('dpms:analytics:advanced'), async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
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
          clinicId: cid,
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

router.get('/treatment-stats', requireCapability('dpms:analytics:advanced'), async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const treatments = await prisma.treatmentPlan.groupBy({
      by: ['procedure'],
      where: { patient: { clinicId: cid } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    res.json(
      treatments.map((t) => ({
        procedure: t.procedure,
        count: t._count.id,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/doctor-revenue', requireCapability('dpms:analytics:advanced'), async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const rows = await prisma.invoice.groupBy({
      by: ['userId'],
      where: {
        clinicId: cid,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { paid: true, total: true },
    });

    const userIds = rows.map((r) => r.userId);
    const users =
      userIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: userIds }, clinicId: cid },
            select: { id: true, name: true },
          });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    res.json(
      rows.map((r) => ({
        userId: r.userId,
        doctorName: nameById.get(r.userId) ?? null,
        paid: Number(r._sum.paid) || 0,
        total: Number(r._sum.total) || 0,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-closing', requireCapability('dpms:billing:read'), async (req: AuthRequest, res) => {
  try {
    const cid = resolveBusinessClinicId(req);
    const day = req.query.date ? new Date(String(req.query.date)) : new Date();
    if (Number.isNaN(day.getTime())) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const payScope = { invoice: { clinicId: cid } };

    const [totals, byMethod, bySource] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...payScope, paymentStatus: 'VERIFIED', date: { gte: day, lt: nextDay } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { ...payScope, paymentStatus: 'VERIFIED', date: { gte: day, lt: nextDay } },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['paymentSource'],
        where: { ...payScope, paymentStatus: 'VERIFIED', date: { gte: day, lt: nextDay } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      clinicId: cid,
      date: day.toISOString(),
      paymentCount: totals._count.id,
      totalPayments: Number(totals._sum.amount) || 0,
      byMethod: byMethod.map((m) => ({
        method: m.method,
        amount: Number(m._sum.amount) || 0,
      })),
      byPaymentSource: bySource.map((s) => ({
        paymentSource: s.paymentSource,
        amount: Number(s._sum.amount) || 0,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
