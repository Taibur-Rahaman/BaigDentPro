import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireSuperAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

// List all clinics (users) with basic stats
router.get('/clinics', async (req: AuthRequest, res) => {
  try {
    const { search, page = '1', limit = '20' } = req.query as { search?: string; page?: string; limit?: string };
    const skip = (parseInt(page || '1', 10) - 1) * parseInt(limit || '20', 10);
    const take = Math.min(parseInt(limit || '20', 10), 100);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicName: true,
          clinicAddress: true,
          clinicPhone: true,
          createdAt: true,
          _count: {
            select: { patients: true, appointments: true, prescriptions: true, invoices: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ clinics: users, total, page: parseInt(page || '1', 10), limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Branch-wise revenue (revenue per user/clinic)
router.get('/revenue-by-branch', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const users = await prisma.user.findMany({
      select: { id: true, name: true, clinicName: true, email: true },
    });

    const revenueByUser = await prisma.invoice.groupBy({
      by: ['userId'],
      where: {
        date: { gte: start, lte: end },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { paid: true, total: true },
      _count: { id: true },
    });

    const map = new Map(revenueByUser.map((r) => [r.userId, r]));
    const branches = users.map((u) => ({
      userId: u.id,
      name: u.name,
      clinicName: u.clinicName,
      email: u.email,
      revenue: Number(map.get(u.id)?._sum.paid ?? 0),
      totalInvoiced: Number(map.get(u.id)?._sum.total ?? 0),
      invoiceCount: map.get(u.id)?._count.id ?? 0,
    }));

    branches.sort((a, b) => b.revenue - a.revenue);
    res.json({ branches, start: start.toISOString(), end: end.toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chair utilization: appointments per clinic per day (simplified)
router.get('/chair-utilization', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();

    const byUser = await prisma.appointment.groupBy({
      by: ['userId'],
      where: {
        date: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
      },
      _count: { id: true },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: byUser.map((b) => b.userId) } },
      select: { id: true, name: true, clinicName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const utilization = byUser.map((b) => ({
      userId: b.userId,
      clinicName: userMap.get(b.userId)?.clinicName,
      userName: userMap.get(b.userId)?.name,
      appointmentCount: b._count.id,
    }));

    utilization.sort((a, b) => b.appointmentCount - a.appointmentCount);
    res.json({ utilization, start: start.toISOString(), end: end.toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activity logs (all users)
router.get('/activity-logs', async (req: AuthRequest, res) => {
  try {
    const { userId, action, entity, page = '1', limit = '50' } = req.query as {
      userId?: string;
      action?: string;
      entity?: string;
      page?: string;
      limit?: string;
    };
    const skip = (parseInt(page || '1', 10) - 1) * parseInt(limit || '50', 10);
    const take = Math.min(parseInt(limit || '50', 10), 200);

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, clinicName: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page || '1', 10), limit: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global stats for super admin dashboard
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      totalClinics,
      totalPatients,
      totalAppointments,
      totalPrescriptions,
      totalRevenue,
      activityLogCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.prescription.count(),
      prisma.invoice.aggregate({ where: { status: { in: ['PAID', 'PARTIAL'] } }, _sum: { paid: true } }),
      prisma.activityLog.count(),
    ]);

    res.json({
      totalClinics,
      totalPatients,
      totalAppointments,
      totalPrescriptions,
      totalRevenue: Number(totalRevenue._sum.paid ?? 0),
      activityLogCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
