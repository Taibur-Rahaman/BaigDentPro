/**
 * Offline / no-token demo paths: domain-shaped rows built without a server round-trip.
 * UI must use `api.optimistic.*` only (`src/api.ts` façade) — do not import this module from pages/components.
 */
import type { PracticeAppointmentListItem } from '@/types/practiceAppointments';
import type { PracticePatientSummary } from '@/types/practicePatients';
import type { PracticePrescriptionDrugRow, PracticePrescriptionListItem } from '@/types/practicePrescriptions';

export function optimisticPatientFromForm(input: {
  name: string;
  phone: string;
  age: string;
  gender: string;
  email: string;
  address: string;
  bloodGroup: string;
  occupation: string;
  refBy: string;
  ordinal: number;
}): PracticePatientSummary {
  return {
    id: crypto.randomUUID(),
    regNo: `P${String(input.ordinal + 1).padStart(5, '0')}`,
    name: input.name,
    phone: input.phone,
    age: input.age,
    gender: input.gender,
    email: input.email || undefined,
    address: input.address || undefined,
    bloodGroup: input.bloodGroup || undefined,
    occupation: input.occupation || undefined,
    refBy: input.refBy || undefined,
    createdAt: Date.now(),
  };
}

export function optimisticAppointmentFromForm(input: {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string;
  type: string;
}): PracticeAppointmentListItem {
  return {
    id: crypto.randomUUID(),
    patientId: input.patientId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    date: input.date,
    time: input.time,
    type: input.type,
    status: 'SCHEDULED',
    duration: 30,
  };
}

export function optimisticPrescriptionFromForm(input: {
  patientId: string;
  patient?: PracticePatientSummary | null;
  diagnosis: string;
  drugs: PracticePrescriptionDrugRow[];
}): PracticePrescriptionListItem {
  const p = input.patient;
  const pid = input.patientId;
  return {
    id: crypto.randomUUID(),
    patientId: pid,
    patientName: p?.name || 'Unknown',
    date: new Date().toISOString().slice(0, 10),
    diagnosis: input.diagnosis,
    patient: {
      id: pid,
      name: p?.name || 'Unknown',
      phone: p?.phone ?? '',
      regNo: p?.regNo,
    },
    drugs: input.drugs,
  };
}
