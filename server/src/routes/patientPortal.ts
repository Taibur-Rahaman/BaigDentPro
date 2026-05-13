import { createHash, randomInt } from 'node:crypto';
import { Router } from 'express';
import type { MedicalHistory } from '@prisma/client';
import { prisma } from '../index.js';
import { JWT_SECRET } from '../utils/config.js';
import { signPatientPortalAccessToken } from '../utils/patientPortalToken.js';
import {
  issuePatientPortalRefreshToken,
  revokePatientPortalRefreshTokenByRaw,
  validatePatientPortalRefreshToken,
} from '../services/patientPortalRefreshTokenService.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  patientPortalBookAppointmentBodySchema,
  patientPortalProfileUpdateBodySchema,
  patientPortalRefreshBodySchema,
  patientPortalRequestOtpBodySchema,
  patientPortalVerifyOtpBodySchema,
} from '../validation/schemas.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { authenticatePatientPortal, type PatientPortalRequest } from '../middleware/patientPortalAuth.js';
import {
  workflowCreateAppointment,
  workflowSetAppointmentStatus,
  AppointmentConflictError,
} from '../domains/workflow/appointmentWorkflowService.js';

const router = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_PEPPER = process.env.PATIENT_PORTAL_OTP_PEPPER ?? JWT_SECRET;

function hashOtpCode(patientId: string, code: string): string {
  return createHash('sha256').update(`${OTP_PEPPER}:${patientId}:${code}`, 'utf8').digest('hex');
}

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, '');
}

async function findPatientByPhoneClinic(phone: string, clinicId: string) {
  const trimmed = phone.trim();
  const direct = await prisma.patient.findFirst({
    where: { clinicId, phone: trimmed },
    select: { id: true, clinicId: true, name: true, phone: true, email: true, address: true, userId: true },
  });
  if (direct) return direct;
  const want = normalizeDigits(phone);
  if (!want) return null;
  const candidates = await prisma.patient.findMany({
    where: { clinicId },
    select: { id: true, clinicId: true, name: true, phone: true, email: true, address: true, userId: true },
    take: 250,
  });
  return (
    candidates.find((p) => normalizeDigits(p.phone) === want) ??
    candidates.find((p) => normalizeDigits(p.phone).endsWith(want) && want.length >= 8) ??
    null
  );
}

function medicalSummaryFromHistory(h: MedicalHistory | null): { title: string; lines: string[] }[] {
  if (!h) return [];
  const sections: { title: string; lines: string[] }[] = [];
  const conditions: string[] = [];
  if (h.diabetes) conditions.push('Diabetes');
  if (h.heartProblems) conditions.push('Heart problems');
  if (h.asthma) conditions.push('Asthma');
  if (h.bloodPressure) conditions.push('Blood pressure concerns');
  if (conditions.length) sections.push({ title: 'Conditions', lines: conditions });
  const allergies: string[] = [];
  if (h.allergyPenicillin) allergies.push('Penicillin');
  if (h.allergyAspirin) allergies.push('Aspirin');
  if (h.allergyOther?.trim()) allergies.push(`Other: ${h.allergyOther.trim()}`);
  if (allergies.length) sections.push({ title: 'Allergies', lines: allergies });
  return sections;
}

router.post(
  '/auth/request-otp',
  validateBody(patientPortalRequestOtpBodySchema),
  asyncRoute('patientPortal.auth.requestOtp', async (req, res) => {
    const { phone, clinicId } = req.body as { phone: string; clinicId: string };
    const patient = await findPatientByPhoneClinic(phone, clinicId);
    if (!patient) {
      res.status(404).json({ error: 'No patient record matches this phone for the clinic.' });
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashOtpCode(patient.id, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await prisma.patientPortalOtp.deleteMany({ where: { patientId: patient.id } });
    await prisma.patientPortalOtp.create({
      data: { patientId: patient.id, clinicId, codeHash, expiresAt },
    });

    const out: Record<string, unknown> = { ok: true, expiresInSec: Math.floor(OTP_TTL_MS / 1000) };
    if (process.env.NODE_ENV !== 'production' || process.env.PATIENT_PORTAL_RETURN_OTP === '1') {
      out.devCode = code;
    }
    console.info(`[patient-portal] OTP issued for patient ${patient.id} clinic ${clinicId}`);
    res.json(out);
  })
);

router.post(
  '/auth/verify-otp',
  validateBody(patientPortalVerifyOtpBodySchema),
  asyncRoute('patientPortal.auth.verifyOtp', async (req, res) => {
    const { phone, clinicId, code } = req.body as { phone: string; clinicId: string; code: string };
    const patient = await findPatientByPhoneClinic(phone, clinicId);
    if (!patient) {
      res.status(404).json({ error: 'No patient record matches this phone for the clinic.' });
      return;
    }
    const expectHash = hashOtpCode(patient.id, code);
    const row = await prisma.patientPortalOtp.findFirst({
      where: { patientId: patient.id, clinicId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.codeHash !== expectHash) {
      res.status(401).json({ error: 'Invalid or expired code' });
      return;
    }
    await prisma.patientPortalOtp.delete({ where: { id: row.id } });
    const token = signPatientPortalAccessToken({ patientId: patient.id, clinicId: patient.clinicId });
    const refreshToken = await issuePatientPortalRefreshToken(patient.id);
    res.json({ token, refreshToken, patient: { id: patient.id, name: patient.name, clinicId: patient.clinicId } });
  })
);

router.post(
  '/auth/refresh',
  validateBody(patientPortalRefreshBodySchema),
  asyncRoute('patientPortal.auth.refresh', async (req, res) => {
    const { refreshToken: raw } = req.body as { refreshToken: string };
    const row = await validatePatientPortalRefreshToken(raw);
    if (!row) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    await revokePatientPortalRefreshTokenByRaw(raw);
    const token = signPatientPortalAccessToken({ patientId: row.patient.id, clinicId: row.patient.clinicId });
    const refreshToken = await issuePatientPortalRefreshToken(row.patient.id);
    res.json({ token, refreshToken });
  })
);

router.get(
  '/me',
  authenticatePatientPortal,
  asyncRoute('patientPortal.me', async (req: PatientPortalRequest, res) => {
    const p = req.patientPortal!.patient;
    res.json({
      profile: {
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        address: p.address,
        clinicId: p.clinicId,
      },
    });
  })
);

router.put(
  '/me',
  authenticatePatientPortal,
  validateBody(patientPortalProfileUpdateBodySchema),
  asyncRoute('patientPortal.me.update', async (req: PatientPortalRequest, res) => {
    const body = req.body as { name?: string; email?: string | null; address?: string | null };
    const id = req.patientPortal!.patientId;
    const data = {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.email !== undefined ? { email: body.email === null || body.email === '' ? null : body.email.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address === null ? null : body.address.trim() } : {}),
    };
    const patient = await prisma.patient.update({
      where: { id },
      data,
      select: { id: true, name: true, phone: true, email: true, address: true, clinicId: true },
    });
    res.json({ profile: patient });
  })
);

router.get(
  '/medical-summary',
  authenticatePatientPortal,
  asyncRoute('patientPortal.medicalSummary', async (req: PatientPortalRequest, res) => {
    const patientId = req.patientPortal!.patientId;
    const mh = await prisma.medicalHistory.findUnique({ where: { patientId } });
    res.json({ sections: medicalSummaryFromHistory(mh) });
  })
);

router.get(
  '/appointments',
  authenticatePatientPortal,
  asyncRoute('patientPortal.appointments.list', async (req: PatientPortalRequest, res) => {
    const patientId = req.patientPortal!.patientId;
    const list = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: 50,
      select: {
        id: true,
        date: true,
        time: true,
        duration: true,
        status: true,
        type: true,
        notes: true,
      },
    });
    res.json({ appointments: list });
  })
);

router.post(
  '/appointments',
  authenticatePatientPortal,
  validateBody(patientPortalBookAppointmentBodySchema),
  asyncRoute('patientPortal.appointments.create', async (req: PatientPortalRequest, res) => {
    const pp = req.patientPortal!;
    const body = req.body as { date: string; time: string; duration?: number; notes?: string | null };
    const when = new Date(body.date);
    if (Number.isNaN(when.getTime())) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }
    try {
      const apt = await workflowCreateAppointment({
        clinicId: pp.clinicId,
        patientId: pp.patientId,
        doctorUserId: pp.patient.userId,
        date: when,
        time: body.time.trim(),
        duration: body.duration ?? 30,
        type: 'Patient portal',
        notes: body.notes?.trim() || null,
        chairId: null,
      });
      res.status(201).json({
        appointment: {
          id: apt.id,
          date: apt.date,
          time: apt.time,
          duration: apt.duration,
          status: apt.status,
          type: apt.type,
          notes: apt.notes,
        },
      });
    } catch (e: unknown) {
      if (e instanceof AppointmentConflictError) {
        res.status(409).json({ error: e.message });
        return;
      }
      const err = e as { code?: number; message?: string };
      if (err?.code === 404) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }
      if (err?.code === 400) {
        res.status(400).json({ error: 'Assigned practitioner is not valid for this clinic' });
        return;
      }
      throw e;
    }
  })
);

router.delete(
  '/appointments/:id',
  authenticatePatientPortal,
  asyncRoute('patientPortal.appointments.cancel', async (req: PatientPortalRequest, res) => {
    const { id } = req.params;
    const pp = req.patientPortal!;
    const existing = await prisma.appointment.findFirst({ where: { id, patientId: pp.patientId, clinicId: pp.clinicId } });
    if (!existing) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    if (existing.status !== 'SCHEDULED' && existing.status !== 'CONFIRMED') {
      res.status(400).json({ error: 'Only scheduled or confirmed visits can be cancelled online' });
      return;
    }
    await workflowSetAppointmentStatus({
      clinicId: pp.clinicId,
      appointmentId: id,
      status: 'CANCELLED',
      patientIdScope: pp.patientId,
    });
    res.json({ ok: true });
  })
);

router.get(
  '/billing/invoices',
  authenticatePatientPortal,
  asyncRoute('patientPortal.billing.invoices', async (req: PatientPortalRequest, res) => {
    const patientId = req.patientPortal!.patientId;
    const invoices = await prisma.invoice.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: 80,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        dueDate: true,
        status: true,
        total: true,
        paid: true,
        due: true,
      },
    });
    res.json({ invoices });
  })
);

router.post(
  '/billing/invoices/:id/payment-link',
  authenticatePatientPortal,
  asyncRoute('patientPortal.billing.paymentLink', async (req: PatientPortalRequest, res) => {
    const { id } = req.params;
    const patientId = req.patientPortal!.patientId;
    const inv = await prisma.invoice.findFirst({ where: { id, patientId } });
    if (!inv) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json({
      paymentLink: null as string | null,
      status: 'contact_clinic',
      message: 'Online pay-by-link is not enabled for this clinic. Please pay at the desk or call the clinic.',
      invoiceId: inv.id,
      balanceDue: inv.due,
    });
  })
);

export default router;
