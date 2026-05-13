import { ApiHttpError } from '@/lib/apiErrors';
import { isRecord, numField } from '@/lib/core/domainShared';
import { patientPortalApiRequest } from '@/lib/core/corePatientPortalHttp';
import type { PatientPortalAppointmentRow } from '@/types/patientPortal';

function parseAppointmentRow(x: unknown): PatientPortalAppointmentRow | null {
  if (!isRecord(x) || typeof x.id !== 'string') return null;
  const dateVal = x.date;
  const date =
    typeof dateVal === 'string'
      ? dateVal
      : dateVal instanceof Date
        ? dateVal.toISOString()
        : '';
  return {
    id: x.id,
    date,
    time: typeof x.time === 'string' ? x.time : '',
    duration: numField(x, 'duration') || 30,
    status: typeof x.status === 'string' ? x.status : '',
    type: x.type === null || typeof x.type === 'string' ? x.type : null,
    notes: x.notes === null || typeof x.notes === 'string' ? x.notes : null,
  };
}

export async function corePatientPortalAppointmentsList(): Promise<{ appointments: PatientPortalAppointmentRow[] }> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/appointments', { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.appointments)) {
    throw new ApiHttpError('Invalid appointments response', 500, '');
  }
  const appointments = raw.appointments.map(parseAppointmentRow).filter((r): r is PatientPortalAppointmentRow => r !== null);
  return { appointments };
}

export type PatientPortalBookInput = {
  date: string;
  time: string;
  duration?: number;
  notes?: string | null;
};

export async function corePatientPortalAppointmentBook(
  body: PatientPortalBookInput
): Promise<{ appointment: PatientPortalAppointmentRow }> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/appointments', { method: 'POST', body });
  if (!isRecord(raw) || raw.appointment === undefined) {
    throw new ApiHttpError('Invalid appointment create response', 500, '');
  }
  const row = parseAppointmentRow(raw.appointment);
  if (!row) throw new ApiHttpError('Invalid appointment row', 500, '');
  return { appointment: row };
}

export async function corePatientPortalAppointmentCancel(id: string): Promise<{ ok: boolean }> {
  const enc = encodeURIComponent(id);
  return patientPortalApiRequest<{ ok: boolean }>(`/patient-portal/appointments/${enc}`, { method: 'DELETE' });
}
