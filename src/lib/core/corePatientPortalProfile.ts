import { ApiHttpError } from '@/lib/apiErrors';
import { isRecord } from '@/lib/core/domainShared';
import { patientPortalApiRequest } from '@/lib/core/corePatientPortalHttp';
import type { PatientPortalMedicalSection, PatientPortalProfile } from '@/types/patientPortal';

const CACHE_PREFIX = 'baigdentpro:pp:med:';

function parseProfilePayload(raw: unknown): PatientPortalProfile {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    throw new ApiHttpError('Invalid patient profile', 500, '');
  }
  return {
    id: raw.id,
    name: raw.name,
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    email: raw.email === null || typeof raw.email === 'string' ? raw.email : null,
    address: raw.address === null || typeof raw.address === 'string' ? raw.address : null,
    clinicId: typeof raw.clinicId === 'string' ? raw.clinicId : '',
  };
}

export async function corePatientPortalProfileGet(): Promise<{ profile: PatientPortalProfile }> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/me', { method: 'GET' });
  if (!isRecord(raw) || raw.profile === undefined) {
    throw new ApiHttpError('Invalid profile response', 500, '');
  }
  return { profile: parseProfilePayload(raw.profile) };
}

export type PatientPortalProfileUpdate = {
  name?: string;
  email?: string | null;
  address?: string | null;
};

export async function corePatientPortalProfileUpdate(
  body: PatientPortalProfileUpdate
): Promise<{ profile: PatientPortalProfile }> {
  const raw = await patientPortalApiRequest<unknown>('/patient-portal/me', { method: 'PUT', body });
  if (!isRecord(raw) || raw.profile === undefined) {
    throw new ApiHttpError('Invalid profile response', 500, '');
  }
  return { profile: parseProfilePayload(raw.profile) };
}

function parseMedical(raw: unknown): { sections: PatientPortalMedicalSection[] } {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) {
    throw new ApiHttpError('Invalid medical summary', 500, '');
  }
  const sections = raw.sections
    .map((s) => {
      if (!isRecord(s) || typeof s.title !== 'string') return null;
      const lines = Array.isArray(s.lines) ? s.lines.filter((x) => typeof x === 'string') : [];
      return { title: s.title, lines };
    })
    .filter((x): x is PatientPortalMedicalSection => x !== null);
  return { sections };
}

/** Offline-friendly cache in sessionStorage (core-only; not clinical localStorage). */
export function cachePatientMedicalSummary(patientId: string, sections: PatientPortalMedicalSection[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + patientId,
      JSON.stringify({ savedAt: Date.now(), sections })
    );
  } catch {
    /* ignore */
  }
}

export function readCachedPatientMedicalSummary(patientId: string): PatientPortalMedicalSection[] | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + patientId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sections?: PatientPortalMedicalSection[] };
    if (!Array.isArray(parsed.sections)) return null;
    return parsed.sections;
  } catch {
    return null;
  }
}

export async function corePatientPortalMedicalSummaryGet(
  patientId: string
): Promise<{ sections: PatientPortalMedicalSection[] }> {
  try {
    const data = await patientPortalApiRequest<unknown>('/patient-portal/medical-summary', { method: 'GET' });
    const parsed = parseMedical(data);
    cachePatientMedicalSummary(patientId, parsed.sections);
    return parsed;
  } catch (e) {
    const fromCache = readCachedPatientMedicalSummary(patientId);
    if (fromCache && fromCache.length > 0) {
      return { sections: fromCache };
    }
    throw e;
  }
}
