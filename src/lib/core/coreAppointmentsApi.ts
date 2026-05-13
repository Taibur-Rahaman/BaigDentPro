import { ApiHttpError } from '@/lib/apiErrors';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, utcOrDateToLocalYmd } from '@/lib/core/domainShared';
import type { PracticeAppointmentListItem } from '@/types/practiceAppointments';

/** Exported for dashboard bundle parsing. */
export function parseAppointmentListItem(row: unknown): PracticeAppointmentListItem | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const patientRaw = row.patient;
  let patientName = 'Unknown';
  let patientPhone: string | undefined;
  let nestedPatientId = '';
  if (isRecord(patientRaw)) {
    nestedPatientId = typeof patientRaw.id === 'string' ? patientRaw.id : '';
    patientName =
      typeof patientRaw.name === 'string' && patientRaw.name.trim() ? patientRaw.name : patientName;
    if (typeof patientRaw.phone === 'string' && patientRaw.phone.trim()) patientPhone = patientRaw.phone;
  }
  const patientId =
    typeof row.patientId === 'string' && row.patientId.trim() ? row.patientId : nestedPatientId;
  const datePart = utcOrDateToLocalYmd(row.date);
  return {
    id: row.id,
    patientId,
    patientName,
    patientPhone,
    date: datePart,
    time: typeof row.time === 'string' ? row.time : '',
    type: typeof row.type === 'string' ? row.type : 'Checkup',
    status: typeof row.status === 'string' ? row.status : 'SCHEDULED',
    duration: typeof row.duration === 'number' && !Number.isNaN(row.duration) ? row.duration : 30,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
  };
}

export async function coreApiAppointmentsList(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<PracticeAppointmentListItem[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const raw = await coreApiRequest<unknown>(`/appointments${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!Array.isArray(raw)) {
    throw new ApiHttpError('Invalid appointments list response', 500, '');
  }
  return raw.map(parseAppointmentListItem).filter((x): x is PracticeAppointmentListItem => x !== null);
}

function expectAppointmentRow(raw: unknown): PracticeAppointmentListItem {
  const p = parseAppointmentListItem(raw);
  if (!p) {
    throw new ApiHttpError('Invalid appointment response', 500, '');
  }
  return p;
}

export async function coreApiAppointmentById(id: string): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}`, { method: 'GET' });
  return expectAppointmentRow(raw);
}

export type CoreApiAppointmentCreateBody = {
  patientId: string;
  date: string;
  time: string;
  duration?: number;
  type?: string;
  notes?: string;
  chairId?: string | null;
  userId?: string;
  doctorId?: string;
};

export async function coreApiAppointmentCreate(body: CoreApiAppointmentCreateBody): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>('/appointments', { method: 'POST', body });
  return expectAppointmentRow(raw);
}

export type CoreApiAppointmentUpdateBody = {
  date?: string;
  time?: string;
  duration?: number;
  type?: string;
  status?: string;
  notes?: string;
  chairId?: string | null;
  userId?: string;
  doctorId?: string;
};

export async function coreApiAppointmentUpdate(
  id: string,
  body: CoreApiAppointmentUpdateBody
): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
  return expectAppointmentRow(raw);
}

export async function coreApiAppointmentDelete(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiAppointmentCancel(id: string): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  return expectAppointmentRow(raw);
}

export async function coreApiAppointmentComplete(id: string): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}/complete`, { method: 'POST' });
  return expectAppointmentRow(raw);
}

export async function coreApiAppointmentConfirm(id: string): Promise<PracticeAppointmentListItem> {
  const raw = await coreApiRequest<unknown>(`/appointments/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
  return expectAppointmentRow(raw);
}

export async function coreApiAppointmentsToday(): Promise<PracticeAppointmentListItem[]> {
  const raw = await coreApiRequest<unknown>('/appointments/today', { method: 'GET' });
  if (!Array.isArray(raw)) throw new ApiHttpError('Invalid appointments today response', 500, '');
  return raw.map(parseAppointmentListItem).filter((x): x is PracticeAppointmentListItem => x !== null);
}

export async function coreApiAppointmentsUpcoming(limit = 10): Promise<PracticeAppointmentListItem[]> {
  const raw = await coreApiRequest<unknown>(
    `/appointments/upcoming?limit=${encodeURIComponent(String(limit))}`,
    { method: 'GET' }
  );
  if (!Array.isArray(raw)) throw new ApiHttpError('Invalid appointments upcoming response', 500, '');
  return raw.map(parseAppointmentListItem).filter((x): x is PracticeAppointmentListItem => x !== null);
}

export async function coreApiAppointmentsCalendar(
  month: number,
  year: number
): Promise<Record<string, PracticeAppointmentListItem[]>> {
  const raw = await coreApiRequest<unknown>(
    `/appointments/calendar?month=${month}&year=${year}`,
    { method: 'GET' }
  );
  if (!isRecord(raw)) throw new ApiHttpError('Invalid appointments calendar response', 500, '');
  const out: Record<string, PracticeAppointmentListItem[]> = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (!Array.isArray(v)) continue;
    out[k] = v.map(parseAppointmentListItem).filter((x): x is PracticeAppointmentListItem => x !== null);
  }
  return out;
}
