import { ApiHttpError } from '@/lib/apiErrors';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField, utcOrDateToLocalYmd } from '@/lib/core/domainShared';
import type { PracticePrescriptionDrugRow, PracticePrescriptionListItem } from '@/types/practicePrescriptions';

function parseDrugRow(row: unknown, idx: number): PracticePrescriptionDrugRow | null {
  if (!isRecord(row)) return null;
  const brand =
    typeof row.drugName === 'string' && row.drugName.trim()
      ? row.drugName
      : typeof row.genericName === 'string'
        ? row.genericName
        : '';
  return {
    id: typeof row.id === 'string' ? row.id : `rx-${idx}`,
    brand,
    dose: typeof row.dosage === 'string' ? row.dosage : '',
    duration: typeof row.duration === 'string' ? row.duration : '',
    frequency: typeof row.frequency === 'string' ? row.frequency : '',
    instruction: typeof row.instructions === 'string' ? row.instructions : '',
    maxDailyDose: typeof row.maxDailyDose === 'string' ? row.maxDailyDose : '',
    doctorNotes: typeof row.doctorNotes === 'string' ? row.doctorNotes : '',
    allowDoseOverride: row.allowDoseOverride === true,
    beforeFood: row.beforeFood === true,
    afterFood: row.afterFood !== false,
  };
}

function parsePrescriptionListItem(row: unknown): PracticePrescriptionListItem | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const dateStr =
    row.date instanceof Date
      ? utcOrDateToLocalYmd(row.date)
      : typeof row.date === 'string'
        ? utcOrDateToLocalYmd(row.date)
        : '';
  const patientRaw = row.patient;
  const patient: PracticePrescriptionListItem['patient'] = { id: '', name: '', phone: '' };
  if (isRecord(patientRaw)) {
    patient.id = typeof patientRaw.id === 'string' ? patientRaw.id : '';
    patient.name = typeof patientRaw.name === 'string' ? patientRaw.name : '';
    patient.phone = typeof patientRaw.phone === 'string' ? patientRaw.phone : '';
    if (typeof patientRaw.regNo === 'string' && patientRaw.regNo.trim()) patient.regNo = patientRaw.regNo;
  }
  const patientId =
    typeof row.patientId === 'string' && row.patientId.trim() ? row.patientId : patient.id;
  const items = Array.isArray(row.items) ? row.items : [];
  const drugs = items
    .map((it, i) => parseDrugRow(it, i))
    .filter((x): x is PracticePrescriptionDrugRow => x !== null);
  return {
    id: row.id,
    patientId,
    patientName: patient.name || 'Unknown',
    date: dateStr,
    diagnosis: typeof row.diagnosis === 'string' ? row.diagnosis : '',
    patient,
    drugs,
  };
}

export async function coreApiPrescriptionsList(params?: {
  patientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ prescriptions: PracticePrescriptionListItem[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.patientId) q.set('patientId', params.patientId);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 50));
  const raw = await coreApiRequest<unknown>(`/prescriptions?${q.toString()}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.prescriptions)) {
    throw new ApiHttpError('Invalid prescriptions list response', 500, '');
  }
  const prescriptions = raw.prescriptions
    .map(parsePrescriptionListItem)
    .filter((x): x is PracticePrescriptionListItem => x !== null);
  return {
    prescriptions,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}

function expectPrescriptionRow(raw: unknown): PracticePrescriptionListItem {
  const p = parsePrescriptionListItem(raw);
  if (!p) throw new ApiHttpError('Invalid prescription response', 500, '');
  return p;
}

export async function coreApiPrescriptionById(id: string): Promise<PracticePrescriptionListItem> {
  const raw = await coreApiRequest<unknown>(`/prescriptions/${encodeURIComponent(id)}`, { method: 'GET' });
  return expectPrescriptionRow(raw);
}

export async function coreApiPrescriptionCreate(body: Record<string, unknown>): Promise<PracticePrescriptionListItem> {
  const raw = await coreApiRequest<unknown>('/prescriptions', { method: 'POST', body });
  return expectPrescriptionRow(raw);
}

export async function coreApiPrescriptionUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<PracticePrescriptionListItem> {
  const raw = await coreApiRequest<unknown>(`/prescriptions/${encodeURIComponent(id)}`, { method: 'PUT', body });
  return expectPrescriptionRow(raw);
}

export async function coreApiPrescriptionDelete(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/prescriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiPrescriptionSendEmail(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/prescriptions/${encodeURIComponent(id)}/send-email`, {
    method: 'POST',
  });
  return parseCoreMessageAck(raw);
}

export async function coreApiPrescriptionSendWhatsApp(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/prescriptions/${encodeURIComponent(id)}/send-whatsapp`, {
    method: 'POST',
  });
  return parseCoreMessageAck(raw);
}
