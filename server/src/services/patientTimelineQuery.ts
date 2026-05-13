/**
 * Read-only cross-domain projection for patient lifecycle UI.
 * Aggregates clinical + finance + scheduling facts without embedding finance writes in clinical routes.
 */
import { prisma } from '../index.js';

export type PatientTimelineEventKind =
  | 'appointment'
  | 'treatment_plan'
  | 'treatment_record'
  | 'invoice'
  | 'prescription'
  | 'lab_order';

export type PatientTimelineEvent = {
  id: string;
  kind: PatientTimelineEventKind;
  /** ISO 8601 — appointment uses date+time where possible */
  at: string;
  title: string;
  summary?: string;
  status?: string;
};

function aptTimestamp(date: Date, time: string): Date {
  const d = new Date(date);
  const t = (time || '12:00').trim();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    d.setHours(parseInt(m[1]!, 10), parseInt(m[2]!, 10), 0, 0);
  }
  return d;
}

export async function queryPatientTimeline(patientId: string, clinicId: string): Promise<PatientTimelineEvent[]> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    select: { id: true },
  });
  if (!patient) {
    return [];
  }

  const [appointments, treatmentPlans, treatmentRecords, invoices, prescriptions, labOrders] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, clinicId },
      select: { id: true, date: true, time: true, status: true, type: true, duration: true },
    }),
    prisma.treatmentPlan.findMany({
      where: { patientId, patient: { clinicId } },
      select: {
        id: true,
        createdAt: true,
        diagnosis: true,
        procedure: true,
        status: true,
        toothNumber: true,
      },
    }),
    prisma.treatmentRecord.findMany({
      where: { patientId, patient: { clinicId } },
      select: { id: true, date: true, treatmentDone: true, cost: true, paid: true, due: true },
    }),
    prisma.invoice.findMany({
      where: { patientId, clinicId },
      select: { id: true, date: true, invoiceNo: true, status: true, total: true, paid: true, due: true },
    }),
    prisma.prescription.findMany({
      where: { patientId, patient: { clinicId } },
      select: { id: true, date: true, diagnosis: true },
    }),
    prisma.labOrder.findMany({
      where: { patientId, patient: { clinicId } },
      select: { id: true, orderDate: true, workType: true, status: true },
    }),
  ]);

  const events: PatientTimelineEvent[] = [];

  for (const a of appointments) {
    events.push({
      id: a.id,
      kind: 'appointment',
      at: aptTimestamp(a.date, a.time).toISOString(),
      title: 'Appointment',
      summary: a.type ? String(a.type) : undefined,
      status: a.status,
    });
  }

  for (const tp of treatmentPlans) {
    const parts = [
      tp.toothNumber ? `Tooth ${tp.toothNumber}` : null,
      tp.diagnosis,
      tp.procedure,
    ].filter(Boolean);
    events.push({
      id: tp.id,
      kind: 'treatment_plan',
      at: new Date(tp.createdAt).toISOString(),
      title: 'Treatment plan',
      summary: parts.length ? parts.join(' · ') : undefined,
      status: tp.status,
    });
  }

  for (const r of treatmentRecords) {
    events.push({
      id: r.id,
      kind: 'treatment_record',
      at: new Date(r.date).toISOString(),
      title: 'Treatment',
      summary: r.treatmentDone,
      status: undefined,
    });
  }

  for (const inv of invoices) {
    events.push({
      id: inv.id,
      kind: 'invoice',
      at: new Date(inv.date).toISOString(),
      title: `Invoice ${inv.invoiceNo}`,
      summary: `Total ${inv.total} · Due ${inv.due}`,
      status: inv.status,
    });
  }

  for (const rx of prescriptions) {
    events.push({
      id: rx.id,
      kind: 'prescription',
      at: new Date(rx.date).toISOString(),
      title: 'Prescription',
      summary: rx.diagnosis ?? undefined,
      status: undefined,
    });
  }

  for (const lab of labOrders) {
    events.push({
      id: lab.id,
      kind: 'lab_order',
      at: new Date(lab.orderDate).toISOString(),
      title: 'Lab order',
      summary: lab.workType,
      status: lab.status,
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}
