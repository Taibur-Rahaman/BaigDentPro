import type { Prisma } from '@prisma/client';
import { appointmentWindow, rangesOverlap } from '../utils/appointmentTimeRange.js';

export class AppointmentConflictError extends Error {
  override name = 'AppointmentConflictError';
  constructor(message: string) {
    super(message);
  }
}

type ApptRow = {
  id: string;
  date: Date;
  time: string;
  duration: number;
  chairId: string | null;
};

export async function assertNoAppointmentOverlap(
  prismaTx: Prisma.TransactionClient,
  params: {
    clinicId: string;
    doctorUserId: string;
    chairId?: string | null;
    start: Date;
    end: Date;
    excludeAppointmentId?: string | null;
  }
): Promise<void> {
  const { clinicId, doctorUserId, chairId, start, end, excludeAppointmentId } = params;

  const doctorRows = await prismaTx.appointment.findMany({
    where: {
      clinicId,
      userId: doctorUserId,
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      status: { notIn: ['CANCELLED'] },
    },
    select: { id: true, date: true, time: true, duration: true, chairId: true },
  });

  for (const row of doctorRows) {
    const w = appointmentWindow(row.date, row.time, row.duration);
    if (rangesOverlap(start, end, w.start, w.end)) {
      throw new AppointmentConflictError('This doctor already has an overlapping appointment in that time range');
    }
  }

  if (chairId && String(chairId).trim()) {
    const chairRows = await prismaTx.appointment.findMany({
      where: {
        clinicId,
        chairId: String(chairId).trim(),
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        status: { notIn: ['CANCELLED'] },
      },
      select: { id: true, date: true, time: true, duration: true, chairId: true },
    });
    for (const row of chairRows as ApptRow[]) {
      const w = appointmentWindow(row.date, row.time, row.duration);
      if (rangesOverlap(start, end, w.start, w.end)) {
        throw new AppointmentConflictError('This chair already has an overlapping appointment in that time range');
      }
    }
  }
}
