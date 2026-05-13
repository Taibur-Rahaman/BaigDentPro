/**
 * @domain WORKFLOW
 * Appointment + treatment plan lifecycle — single mutation authority for scheduling overlap + state transitions.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../index.js';
import { appointmentWindow } from '../../utils/appointmentTimeRange.js';
import { assertNoAppointmentOverlap, AppointmentConflictError } from '../../services/appointmentConflictService.js';

export { AppointmentConflictError } from '../../services/appointmentConflictService.js';

export class InvalidStateTransitionError extends Error {
  override name = 'InvalidStateTransitionError';
  constructor(message: string) {
    super(message);
  }
  readonly code = 400 as const;
}

/** Appointment lifecycle (product model). */
export const APPOINTMENT_LIFECYCLE = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export type AppointmentLifecycleStatus = (typeof APPOINTMENT_LIFECYCLE)[number];

const APPOINTMENT_EDGES: Record<string, Set<string>> = {
  SCHEDULED: new Set(['CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW']),
  CONFIRMED: new Set(['IN_PROGRESS', 'CANCELLED', 'NO_SHOW']),
  IN_PROGRESS: new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']),
  COMPLETED: new Set(),
  CANCELLED: new Set(),
  NO_SHOW: new Set(['SCHEDULED']),
};

export function normalizeAppointmentStatus(raw: string | null | undefined): AppointmentLifecycleStatus {
  const u = String(raw ?? 'SCHEDULED').toUpperCase().trim();
  if ((APPOINTMENT_LIFECYCLE as readonly string[]).includes(u)) {
    return u as AppointmentLifecycleStatus;
  }
  return 'SCHEDULED';
}

function assertAppointmentTransition(fromRaw: string, toRaw: string): void {
  const from = normalizeAppointmentStatus(fromRaw);
  const to = normalizeAppointmentStatus(toRaw);
  if (from === to) return;
  const ok = APPOINTMENT_EDGES[from]?.has(to);
  if (!ok) {
    throw new InvalidStateTransitionError(`Invalid appointment transition ${from} → ${to}`);
  }
}

/** Treatment plan lifecycle (maps legacy NOT_STARTED → PLANNED for edges). */
export const TREATMENT_PLAN_LIFECYCLE = ['DIAGNOSED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type TreatmentPlanLifecycleStatus = (typeof TREATMENT_PLAN_LIFECYCLE)[number];

const TREATMENT_EDGES: Record<string, Set<string>> = {
  NOT_STARTED: new Set(['DIAGNOSED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED']),
  DIAGNOSED: new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED']),
  PLANNED: new Set(['IN_PROGRESS', 'COMPLETED']),
  IN_PROGRESS: new Set(['COMPLETED']),
  COMPLETED: new Set(),
};

function normalizeTreatmentPlanStatus(raw: string | null | undefined): string {
  const u = String(raw ?? 'NOT_STARTED').toUpperCase().trim();
  if (u === 'NOT_STARTED') return 'NOT_STARTED';
  if ((TREATMENT_PLAN_LIFECYCLE as readonly string[]).includes(u)) return u;
  return 'NOT_STARTED';
}

function treatmentEdgeFromKey(raw: string): string {
  const n = normalizeTreatmentPlanStatus(raw);
  return n === 'NOT_STARTED' ? 'NOT_STARTED' : n;
}

function assertTreatmentPlanTransition(fromRaw: string, toRaw: string): void {
  const from = treatmentEdgeFromKey(fromRaw);
  const to = treatmentEdgeFromKey(toRaw);
  if (from === to) return;
  const ok = TREATMENT_EDGES[from]?.has(to);
  if (!ok) {
    throw new InvalidStateTransitionError(`Invalid treatment plan transition ${from} → ${to}`);
  }
}

export type WorkflowCreateAppointmentInput = {
  clinicId: string;
  patientId: string;
  doctorUserId: string;
  date: Date;
  time: string;
  duration: number;
  type?: string | null;
  notes?: string | null;
  chairId?: string | null;
};

export async function workflowCreateAppointment(input: WorkflowCreateAppointmentInput) {
  const { clinicId, patientId, doctorUserId, date, time, type, notes, chairId } = input;
  const dur = input.duration || 30;
  const { start, end } = appointmentWindow(date, time, dur);

  return prisma.$transaction(
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
          date,
          time,
          duration: dur,
          type: type ?? undefined,
          notes: notes ?? undefined,
        },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export type WorkflowUpdateAppointmentInput = {
  clinicId: string;
  appointmentId: string;
  existing: {
    id: string;
    userId: string;
    date: Date;
    time: string;
    duration: number;
    chairId: string | null;
    status: string;
  };
  date?: string;
  time?: string;
  duration?: number;
  type?: string;
  status?: string;
  notes?: string | null;
  chairId?: string | null;
  nextDoctorId: string;
  doctorChanged: boolean;
};

export async function workflowUpdateAppointment(input: WorkflowUpdateAppointmentInput) {
  const {
    clinicId,
    appointmentId,
    existing,
    date,
    time,
    duration,
    type,
    status,
    notes,
    chairId,
    nextDoctorId,
    doctorChanged,
  } = input;

  const nextDate = date !== undefined ? new Date(date) : existing.date;
  const nextTime = time !== undefined ? time : existing.time;
  const nextDur = duration !== undefined ? duration : existing.duration;
  const nextChair = chairId !== undefined ? (chairId ? String(chairId).trim() || null : null) : existing.chairId;

  if (status !== undefined) {
    assertAppointmentTransition(existing.status, status);
  }

  const { start, end } = appointmentWindow(nextDate, nextTime, nextDur);

  return prisma.$transaction(
    async (tx) => {
      if (doctorChanged) {
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
        where: { id: appointmentId },
        data: {
          ...(date !== undefined ? { date: new Date(date) } : {}),
          ...(time !== undefined ? { time } : {}),
          ...(duration !== undefined ? { duration } : {}),
          ...(type !== undefined ? { type } : {}),
          ...(status !== undefined ? { status: normalizeAppointmentStatus(status) } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(doctorChanged ? { userId: nextDoctorId } : {}),
          ...(chairId !== undefined ? { chairId: nextChair } : {}),
        },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function workflowSetAppointmentStatus(input: {
  clinicId: string;
  appointmentId: string;
  status: AppointmentLifecycleStatus;
  patientIdScope?: string;
}) {
  const existing = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      clinicId: input.clinicId,
      ...(input.patientIdScope ? { patientId: input.patientIdScope } : {}),
    },
  });
  if (!existing) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
  }
  assertAppointmentTransition(existing.status, input.status);
  return prisma.appointment.update({
    where: { id: input.appointmentId },
    data: { status: input.status },
  });
}

/** Complete visit — allows CONFIRMED/SCHEDULED → IN_PROGRESS → COMPLETED in one operation. */
export async function workflowCompleteAppointment(input: { clinicId: string; appointmentId: string }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findFirst({
      where: { id: input.appointmentId, clinicId: input.clinicId },
    });
    if (!existing) {
      throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
    }
    const s = normalizeAppointmentStatus(existing.status);
    if (s === 'COMPLETED') {
      return existing;
    }
    if (s === 'CANCELLED' || s === 'NO_SHOW') {
      throw new InvalidStateTransitionError(`Cannot complete appointment from ${s}`);
    }
    if (s === 'IN_PROGRESS') {
      assertAppointmentTransition('IN_PROGRESS', 'COMPLETED');
      return tx.appointment.update({
        where: { id: existing.id },
        data: { status: 'COMPLETED' },
      });
    }
    assertAppointmentTransition(s, 'IN_PROGRESS');
    await tx.appointment.update({
      where: { id: existing.id },
      data: { status: 'IN_PROGRESS' },
    });
    assertAppointmentTransition('IN_PROGRESS', 'COMPLETED');
    return tx.appointment.update({
      where: { id: existing.id },
      data: { status: 'COMPLETED' },
    });
  });
}

export async function workflowDeleteAppointment(input: { clinicId: string; appointmentId: string }) {
  const existing = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, clinicId: input.clinicId },
  });
  if (!existing) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
  }
  await prisma.appointment.delete({ where: { id: input.appointmentId } });
}

export async function workflowMarkReminderSent(input: { clinicId: string; appointmentId: string }) {
  const existing = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, patient: { clinicId: input.clinicId } },
  });
  if (!existing) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
  }
  return prisma.appointment.update({
    where: { id: input.appointmentId },
    data: { reminderSent: true, reminderSentAt: new Date() },
  });
}

/** Next free slot for doctor/chair after a conflict (simple 15-minute scan, up to 14 days). */
export async function suggestNextAvailableSlotAfterConflict(input: {
  clinicId: string;
  doctorUserId: string;
  chairId: string | null;
  preferredDate: Date;
  duration: number;
  excludeAppointmentId?: string | null;
}): Promise<{ date: string; time: string } | null> {
  const day = new Date(input.preferredDate);
  day.setHours(0, 0, 0, 0);

  for (let d = 0; d < 14; d++) {
    const scanDay = new Date(day);
    for (let minutes = 8 * 60; minutes <= 17 * 60; minutes += 15) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const { start, end } = appointmentWindow(scanDay, timeStr, input.duration);
      try {
        await prisma.$transaction(
          async (tx) => {
            await assertNoAppointmentOverlap(tx, {
              clinicId: input.clinicId,
              doctorUserId: input.doctorUserId,
              chairId: input.chairId,
              start,
              end,
              excludeAppointmentId: input.excludeAppointmentId ?? null,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        return { date: scanDay.toISOString().slice(0, 10), time: timeStr };
      } catch (e: unknown) {
        if (e instanceof AppointmentConflictError) continue;
        throw e;
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return null;
}

/** Treatment plan PATCH from EMR route — validates status transitions only when status changes. */
export async function workflowApplyTreatmentPlanPut(input: {
  clinicId: string;
  patientId: string;
  planId: string;
  patch: Record<string, unknown>;
}) {
  const existing = await prisma.treatmentPlan.findFirst({
    where: {
      id: input.planId,
      patientId: input.patientId,
      patient: { clinicId: input.clinicId },
    },
  });
  if (!existing) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
  }

  const nextStatusRaw = input.patch.status;
  if (nextStatusRaw !== undefined && nextStatusRaw !== null) {
    const nextStatus = String(nextStatusRaw).trim();
    if (nextStatus !== existing.status) {
      assertTreatmentPlanTransition(existing.status, nextStatus);
    }
  }

  const data: Prisma.TreatmentPlanUpdateInput = {};
  if (input.patch.toothNumber !== undefined) {
    const v = input.patch.toothNumber;
    data.toothNumber =
      v === null || v === ''
        ? null
        : typeof v === 'number'
          ? String(v)
          : String(v).trim() || null;
  }
  if (input.patch.diagnosis !== undefined) data.diagnosis = String(input.patch.diagnosis ?? '');
  if (input.patch.procedure !== undefined) data.procedure = String(input.patch.procedure ?? '');
  if (input.patch.cost !== undefined) {
    data.cost = parseFloat(String(input.patch.cost)) || 0;
  }
  if (input.patch.cc !== undefined) data.cc = input.patch.cc === null ? null : String(input.patch.cc);
  if (input.patch.cf !== undefined) data.cf = input.patch.cf === null ? null : String(input.patch.cf);
  if (input.patch.investigation !== undefined) {
    data.investigation = input.patch.investigation === null ? null : String(input.patch.investigation);
  }
  if (input.patch.status !== undefined) data.status = String(input.patch.status ?? '').trim();
  if (input.patch.notes !== undefined) data.notes = input.patch.notes === null ? null : String(input.patch.notes);

  return prisma.treatmentPlan.update({
    where: { id: existing.id },
    data,
  });
}
