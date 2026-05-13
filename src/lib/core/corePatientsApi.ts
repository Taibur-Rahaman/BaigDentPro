import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';
import type {
  PracticeDentalChartRow,
  PracticeMedicalHistory,
  PracticePatientConsent,
  PracticePatientWorkspaceBundle,
  PracticeTreatmentPlan,
  PracticeTreatmentRecord,
} from '@/types/practicePatientWorkspace';
import type { PracticePatientSummary } from '@/types/practicePatients';

export type CoreApiTreatmentPlanWriteInput = {
  toothNumber?: string;
  diagnosis: string;
  procedure: string;
  cost: number;
  cc: string;
  cf: string;
  investigation: string;
  status: string;
};

export type CoreApiTreatmentRecordWriteInput = {
  treatmentDone: string;
  date?: string;
  cost: string;
  paid: string;
  due: string;
  doctorSignature?: string;
  toothNumber?: string;
  notes?: string;
};

export type CoreApiTreatmentRecordPatchInput = CoreApiTreatmentRecordWriteInput;

export type CoreApiDeletedTreatmentRecordResult = { id: string; deleted: true };

export function parsePatientSummaryRow(row: unknown): PracticePatientSummary | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  let createdAtMs = Date.now();
  if (row.createdAt !== undefined && row.createdAt !== null) {
    const t = new Date(row.createdAt as string | number | Date).getTime();
    if (!Number.isNaN(t)) createdAtMs = t;
  }
  return {
    id: row.id,
    regNo: typeof row.regNo === 'string' && row.regNo.trim() ? row.regNo : undefined,
    name: row.name,
    phone: typeof row.phone === 'string' ? row.phone : '',
    age: row.age != null ? String(row.age) : undefined,
    gender: typeof row.gender === 'string' ? row.gender : undefined,
    email: typeof row.email === 'string' ? row.email : undefined,
    address: typeof row.address === 'string' ? row.address : undefined,
    bloodGroup: typeof row.bloodGroup === 'string' ? row.bloodGroup : undefined,
    occupation: typeof row.occupation === 'string' ? row.occupation : undefined,
    refBy: typeof row.referredBy === 'string' ? row.referredBy : undefined,
    createdAt: createdAtMs,
  };
}

function bool(v: unknown): boolean {
  return v === true;
}

function mapApiMedicalHistoryToPractice(mh: unknown): PracticeMedicalHistory {
  if (!isRecord(mh)) return {};
  return {
    bloodPressure: bool(mh.bloodPressure),
    heartProblems: bool(mh.heartProblems),
    cardiacHtnMiPacemaker: false,
    rheumaticFever: false,
    diabetes: bool(mh.diabetes),
    pepticUlcer: bool(mh.pepticUlcer),
    jaundice: bool(mh.jaundice),
    asthma: bool(mh.asthma),
    tuberculosis: bool(mh.tuberculosis),
    kidneyDiseases: bool(mh.kidneyDiseases),
    aids: bool(mh.aids),
    thyroid: bool(mh.thyroid),
    hepatitis: bool(mh.hepatitis),
    stroke: bool(mh.stroke),
    bleedingDisorder: bool(mh.bleedingDisorder),
    otherDiseases: typeof mh.otherDiseases === 'string' ? mh.otherDiseases : undefined,
    isPregnant: bool(mh.isPregnant),
    isLactating: bool(mh.isLactating),
    allergyPenicillin: bool(mh.allergyPenicillin),
    allergySulphur: bool(mh.allergySulphur),
    allergyAspirin: bool(mh.allergyAspirin),
    allergyLocalAnaesthesia: bool(mh.allergyLocalAnesthesia),
    allergyOther: typeof mh.allergyOther === 'string' ? mh.allergyOther : undefined,
    takingAspirinBloodThinner: bool(mh.takingAspirin),
    takingAntihypertensive: bool(mh.takingAntihypertensive),
    takingInhaler: bool(mh.takingInhaler),
    takingOther: typeof mh.takingOther === 'string' ? mh.takingOther : undefined,
    habitSmoking: bool(mh.habitSmoking),
    habitBetelLeaf: bool(mh.habitBetelLeaf),
    habitAlcohol: bool(mh.habitAlcohol),
    habitOther: typeof mh.habitOther === 'string' ? mh.habitOther : undefined,
    details: typeof mh.notes === 'string' ? mh.notes : undefined,
  };
}

function mapApiTreatmentPlan(row: unknown): PracticeTreatmentPlan | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const cost = row.cost;
  const costStr = typeof cost === 'number' ? String(cost) : typeof cost === 'string' ? cost : '0';
  return {
    id: row.id,
    toothNumber: row.toothNumber === null || row.toothNumber === undefined ? '' : String(row.toothNumber),
    diagnosis: typeof row.diagnosis === 'string' ? row.diagnosis : '',
    procedure: typeof row.procedure === 'string' ? row.procedure : '',
    cost: costStr,
    cc: typeof row.cc === 'string' ? row.cc : '',
    cf: typeof row.cf === 'string' ? row.cf : '',
    investigation: typeof row.investigation === 'string' ? row.investigation : '',
    status: typeof row.status === 'string' ? row.status : '',
  };
}

function mapApiTreatmentRecord(row: unknown): PracticeTreatmentRecord | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const d = row.date;
  const dateStr =
    d instanceof Date
      ? d.toISOString().slice(0, 10)
      : typeof d === 'string'
        ? d.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
  const fnum = (k: string) => {
    const v = row[k];
    return typeof v === 'number' && !Number.isNaN(v) ? String(v) : typeof v === 'string' ? v : '0';
  };
  return {
    id: row.id,
    date: dateStr,
    treatmentDone: typeof row.treatmentDone === 'string' ? row.treatmentDone : '',
    cost: fnum('cost'),
    paid: fnum('paid'),
    due: fnum('due'),
    patientSignature: typeof row.patientSignature === 'string' ? row.patientSignature : undefined,
    doctorSignature: typeof row.doctorSignature === 'string' ? row.doctorSignature : undefined,
  };
}

function mapApiConsent(row: unknown, patientId: string): PracticePatientConsent | null {
  if (!isRecord(row)) return null;
  const sig = row.signatureDate;
  const sigStr =
    sig instanceof Date
      ? sig.toISOString().slice(0, 10)
      : typeof sig === 'string'
        ? sig.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
  return {
    patientId,
    consentText: typeof row.consentText === 'string' ? row.consentText : '',
    signatureName: typeof row.signatureName === 'string' ? row.signatureName : '',
    signatureDate: sigStr,
    agreed: Boolean(row.agreed),
  };
}

export async function coreApiPracticePatientWorkspaceHydration(patientId: string): Promise<PracticePatientWorkspaceBundle> {
  const p = await coreApiRequest<Record<string, unknown>>(`/patients/${encodeURIComponent(patientId)}`, {
    method: 'GET',
  });
  const mhRaw = p.medicalHistory;
  const medicalHistory = mapApiMedicalHistoryToPractice(mhRaw);

  const tpRaw = p.treatmentPlans;
  const treatmentPlans = Array.isArray(tpRaw)
    ? tpRaw.map(mapApiTreatmentPlan).filter((x): x is PracticeTreatmentPlan => x !== null)
    : [];

  const trRaw = p.treatmentRecords;
  const treatmentRecords = Array.isArray(trRaw)
    ? trRaw.map(mapApiTreatmentRecord).filter((x): x is PracticeTreatmentRecord => x !== null)
    : [];

  const consents = p.consents;
  let consent: PracticePatientConsent | null = null;
  if (Array.isArray(consents) && consents.length > 0) {
    consent = mapApiConsent(consents[0], patientId);
  }

  const charts = p.dentalCharts;
  const dentalChartRows = Array.isArray(charts)
    ? charts.map(parseDentalChartRow).filter((x): x is DentalChartRowPayload => x !== null)
    : [];
  const dentalTeethSelected = dentalChartRows.map((r) => r.toothNumber);

  return { medicalHistory, treatmentPlans, treatmentRecords, consent, dentalTeethSelected, dentalChartRows };
}

export function coreApiSerializeMedicalHistoryForUpdate(h: PracticeMedicalHistory): Record<string, unknown> {
  const out: Record<string, unknown> = {
    bloodPressure: Boolean(h.bloodPressure),
    heartProblems: Boolean(h.heartProblems),
    diabetes: Boolean(h.diabetes),
    pepticUlcer: Boolean(h.pepticUlcer),
    jaundice: Boolean(h.jaundice),
    asthma: Boolean(h.asthma),
    tuberculosis: Boolean(h.tuberculosis),
    kidneyDiseases: Boolean(h.kidneyDiseases),
    aids: Boolean(h.aids),
    thyroid: Boolean(h.thyroid),
    hepatitis: Boolean(h.hepatitis),
    stroke: Boolean(h.stroke),
    bleedingDisorder: Boolean(h.bleedingDisorder),
    isPregnant: Boolean(h.isPregnant),
    isLactating: Boolean(h.isLactating),
    allergyPenicillin: Boolean(h.allergyPenicillin),
    allergySulphur: Boolean(h.allergySulphur),
    allergyAspirin: Boolean(h.allergyAspirin),
    allergyLocalAnesthesia: Boolean(h.allergyLocalAnaesthesia),
    takingAspirin: Boolean(h.takingAspirinBloodThinner),
    takingAntihypertensive: Boolean(h.takingAntihypertensive),
    takingInhaler: Boolean(h.takingInhaler),
    habitSmoking: Boolean(h.habitSmoking),
    habitBetelLeaf: Boolean(h.habitBetelLeaf),
    habitAlcohol: Boolean(h.habitAlcohol),
    otherDiseases: h.otherDiseases ?? null,
    allergyOther: h.allergyOther ?? null,
    takingOther: h.takingOther ?? null,
    habitOther: h.habitOther ?? null,
    notes: h.details ?? null,
  };
  return out;
}

function parseEntityIdResponse(raw: unknown, label: string): { id: string } {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim()) {
    throw new ApiHttpError(`Invalid ${label} response`, 500, '');
  }
  return { id: raw.id };
}

export async function coreApiPatientsAddTreatmentPlan(
  patientId: string,
  body: CoreApiTreatmentPlanWriteInput
): Promise<{ id: string }> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
    method: 'POST',
    body,
  });
  return parseEntityIdResponse(raw, 'treatment plan create');
}

export async function coreApiPatientsUpdateTreatmentPlan(
  patientId: string,
  planId: string,
  body: CoreApiTreatmentPlanWriteInput
): Promise<void> {
  await coreApiRequest<unknown>(
    `/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
    { method: 'PUT', body }
  );
}

export async function coreApiPatientsDeleteTreatmentPlan(patientId: string, planId: string): Promise<void> {
  await coreApiRequest<unknown>(
    `/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
    { method: 'DELETE' }
  );
}

export async function coreApiPatientsAddTreatmentRecord(
  patientId: string,
  body: CoreApiTreatmentRecordWriteInput
): Promise<{ id: string }> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(patientId)}/treatment-records`, {
    method: 'POST',
    body: {
      treatmentDone: body.treatmentDone,
      date: body.date,
      cost: body.cost,
      paid: body.paid,
      due: body.due,
      doctorSignature: body.doctorSignature,
      toothNumber: body.toothNumber,
      notes: body.notes,
    },
  });
  return parseEntityIdResponse(raw, 'treatment record create');
}

export async function coreApiPatientsUpdateTreatmentRecord(
  patientId: string,
  recordId: string,
  body: CoreApiTreatmentRecordPatchInput
): Promise<PracticeTreatmentRecord> {
  const raw = await coreApiRequest<unknown>(
    `/patients/${encodeURIComponent(patientId)}/treatment-records/${encodeURIComponent(recordId)}`,
    {
      method: 'PUT',
      body: {
        treatmentDone: body.treatmentDone,
        date: body.date,
        cost: body.cost,
        paid: body.paid,
        due: body.due,
        doctorSignature: body.doctorSignature,
        toothNumber: body.toothNumber,
        notes: body.notes,
      },
    }
  );
  const mapped = mapApiTreatmentRecord(raw);
  if (!mapped) {
    throw new ApiHttpError('Invalid treatment record update response', 500, '');
  }
  return mapped;
}

export async function coreApiPatientsDeleteTreatmentRecord(
  patientId: string,
  recordId: string
): Promise<CoreApiDeletedTreatmentRecordResult> {
  const raw = await coreApiRequest<unknown>(
    `/patients/${encodeURIComponent(patientId)}/treatment-records/${encodeURIComponent(recordId)}`,
    { method: 'DELETE' }
  );
  if (raw == null) {
    return { id: recordId, deleted: true };
  }
  if (!isRecord(raw)) {
    throw new ApiHttpError('Invalid treatment record delete response', 500, '');
  }
  if (typeof raw.message === 'string' && raw.message.trim().length > 0) {
    return { id: recordId, deleted: true };
  }
  throw new ApiHttpError('Invalid treatment record delete response', 500, '');
}

export async function coreApiPatientsList(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ patients: PracticePatientSummary[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const raw = await coreApiRequest<unknown>(`/patients${qs ? `?${qs}` : ''}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.patients)) {
    throw new ApiHttpError('Invalid patients list response', 500, '');
  }
  const patients = raw.patients.map(parsePatientSummaryRow).filter((p): p is PracticePatientSummary => p !== null);
  return {
    patients,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}

function expectPatientSummary(raw: unknown): PracticePatientSummary {
  const p = parsePatientSummaryRow(raw);
  if (!p) throw new ApiHttpError('Invalid patient response', 500, '');
  return p;
}

export async function coreApiPatientGet(id: string): Promise<PracticePatientSummary> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}`, { method: 'GET' });
  return expectPatientSummary(raw);
}

export type PatientTimelineEventPayload = {
  id: string;
  kind: string;
  at: string;
  title: string;
  summary?: string;
  status?: string;
};

function parseTimelineEvent(row: unknown): PatientTimelineEventPayload | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.kind !== 'string') return null;
  return {
    id: row.id,
    kind: row.kind,
    at: typeof row.at === 'string' ? row.at : '',
    title: typeof row.title === 'string' ? row.title : '',
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
  };
}

/** GET /patients/:id/timeline — unified clinical + scheduling + finance read projection */
export async function coreApiPatientTimeline(id: string): Promise<{ events: PatientTimelineEventPayload[] }> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}/timeline`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.events)) {
    throw new ApiHttpError('Invalid timeline response', 500, '');
  }
  const events = raw.events.map(parseTimelineEvent).filter((x): x is PatientTimelineEventPayload => x !== null);
  return { events };
}

export async function coreApiPatientCreate(body: Record<string, unknown>): Promise<PracticePatientSummary> {
  const raw = await coreApiRequest<unknown>('/patients', { method: 'POST', body });
  return expectPatientSummary(raw);
}

export async function coreApiPatientUpdate(id: string, body: Record<string, unknown>): Promise<PracticePatientSummary> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}`, { method: 'PUT', body });
  return expectPatientSummary(raw);
}

export async function coreApiPatientDelete(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiPatientUpdateMedicalHistory(
  id: string,
  body: Record<string, unknown>
): Promise<PracticeMedicalHistory> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}/medical-history`, {
    method: 'PUT',
    body,
  });
  return mapApiMedicalHistoryToPractice(raw);
}

export type DentalChartRowPayload = PracticeDentalChartRow;

function parseDentalChartRow(raw: unknown): DentalChartRowPayload | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.patientId !== 'string') return null;
  const tn = raw.toothNumber;
  const toothNumber = typeof tn === 'number' ? tn : typeof tn === 'string' ? parseInt(tn, 10) : Number.NaN;
  if (Number.isNaN(toothNumber)) return null;
  let surfaces: Record<string, string> | undefined;
  const sur = raw.surfaces;
  if (sur && typeof sur === 'object' && !Array.isArray(sur)) {
    const acc: Record<string, string> = {};
    for (const [k, v] of Object.entries(sur)) {
      if (typeof v === 'string') acc[k] = v;
    }
    if (Object.keys(acc).length) surfaces = acc;
  }
  return {
    id: raw.id,
    patientId: raw.patientId,
    toothNumber,
    condition: raw.condition === null || typeof raw.condition === 'string' ? raw.condition : null,
    surfaces,
    notes: raw.notes === null || typeof raw.notes === 'string' ? raw.notes : null,
    treatment: raw.treatment === null || typeof raw.treatment === 'string' ? raw.treatment : null,
    treatmentDate:
      raw.treatmentDate instanceof Date
        ? raw.treatmentDate.toISOString()
        : typeof raw.treatmentDate === 'string'
          ? raw.treatmentDate
          : null,
  };
}

export async function coreApiPatientUpdateDentalChart(
  id: string,
  body: Record<string, unknown>
): Promise<DentalChartRowPayload> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}/dental-chart`, {
    method: 'PUT',
    body,
  });
  const p = parseDentalChartRow(raw);
  if (!p) throw new ApiHttpError('Invalid dental chart response', 500, '');
  return p;
}

function parseConsentRow(raw: unknown): PracticePatientConsent | null {
  if (!isRecord(raw) || typeof raw.patientId !== 'string') return null;
  const sd = raw.signatureDate;
  const signatureDate =
    sd instanceof Date
      ? sd.toISOString().slice(0, 10)
      : typeof sd === 'string'
        ? sd.slice(0, 10)
        : '';
  return {
    patientId: raw.patientId,
    consentText: typeof raw.consentText === 'string' ? raw.consentText : '',
    signatureName: typeof raw.signatureName === 'string' ? raw.signatureName : '',
    signatureDate,
    agreed: raw.agreed === true,
  };
}

export async function coreApiPatientAddConsent(
  id: string,
  body: Record<string, unknown>
): Promise<PracticePatientConsent> {
  const raw = await coreApiRequest<unknown>(`/patients/${encodeURIComponent(id)}/consent`, {
    method: 'POST',
    body,
  });
  const p = parseConsentRow(raw);
  if (!p) throw new ApiHttpError('Invalid consent response', 500, '');
  return p;
}
