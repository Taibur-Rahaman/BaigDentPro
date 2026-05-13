/**
 * Browser UI persistence (non-auth localStorage) — shared header/print/billing lists.
 * Keys match historical `DashboardPage` / `PrescriptionPage` storage names.
 */
import type {
  DashboardHeaderDraftState,
  DashboardPrintDraftState,
  PrescriptionHeaderSettingsState,
} from '@/types/uiPrefs';

const HEADER_SETTINGS_KEY = 'baigdentpro:headerSettings';
const PRINT_SETUP_KEY = 'baigdentpro:printSetup';
const PRINT_SETUP_OVERRIDES_KEY = 'baigdentpro:printSetupOverrides';
const BILLING_PROCEDURES_KEY = 'baigdentpro:billingProcedures';

function readJson(key: string): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key)?.trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function coreApiUiHydrateDashboardHeaderDraft(prev: DashboardHeaderDraftState): DashboardHeaderDraftState {
  const raw = readJson(HEADER_SETTINGS_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prev;
  const h = raw as Record<string, unknown>;
  return {
    ...prev,
    clinicName: typeof h.clinicName === 'string' ? h.clinicName : prev.clinicName,
    address: typeof h.address === 'string' ? h.address : prev.address,
    phone: typeof h.phone === 'string' ? h.phone : prev.phone,
    clinicLogo: typeof h.clinicLogo === 'string' ? h.clinicLogo : prev.clinicLogo,
    doctorName: typeof h.doctorName === 'string' ? h.doctorName : prev.doctorName,
    degree:
      typeof h.qualification === 'string'
        ? h.qualification
        : typeof h.degree === 'string'
          ? h.degree
          : prev.degree,
    specialization: typeof h.specialization === 'string' ? h.specialization : prev.specialization,
    doctorLogo: typeof h.doctorLogo === 'string' ? h.doctorLogo : prev.doctorLogo,
  };
}

export function coreApiUiHydrateDashboardPrintDraft(prev: DashboardPrintDraftState): DashboardPrintDraftState {
  const raw = readJson(PRINT_SETUP_OVERRIDES_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prev;
  const d = raw as Record<string, unknown>;
  const paperSize =
    d.paperSize === 'A4' || d.paperSize === 'A5' || d.paperSize === 'Letter' ? d.paperSize : prev.paperSize;
  const headerHeight =
    typeof d.headerHeight === 'number' && !Number.isNaN(d.headerHeight) ? d.headerHeight : prev.headerHeight;
  return { ...prev, paperSize, headerHeight };
}

export function coreApiUiSaveDashboardPrintOverrides(draft: DashboardPrintDraftState): void {
  writeJson(PRINT_SETUP_OVERRIDES_KEY, { paperSize: draft.paperSize, headerHeight: draft.headerHeight });
}

export function coreApiUiReadHeaderSettingsRecord(): Record<string, unknown> {
  const raw = readJson(HEADER_SETTINGS_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function coreApiUiMergeDashboardHeaderClinicPatch(
  record: Record<string, unknown>,
  patch: Pick<DashboardHeaderDraftState, 'clinicName' | 'address' | 'phone' | 'clinicLogo'>
): void {
  writeJson(HEADER_SETTINGS_KEY, {
    ...record,
    clinicName: patch.clinicName,
    address: patch.address,
    phone: patch.phone,
    clinicLogo: patch.clinicLogo,
  });
}

export function coreApiUiMergeDashboardHeaderDoctorPatch(
  record: Record<string, unknown>,
  patch: Pick<DashboardHeaderDraftState, 'doctorName' | 'degree' | 'specialization' | 'doctorLogo'>
): void {
  writeJson(HEADER_SETTINGS_KEY, {
    ...record,
    doctorName: patch.doctorName,
    qualification: patch.degree,
    specialization: patch.specialization,
    doctorLogo: patch.doctorLogo,
  });
}

export function coreApiUiHydratePrescriptionHeader(prev: PrescriptionHeaderSettingsState): PrescriptionHeaderSettingsState {
  const raw = readJson(HEADER_SETTINGS_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prev;
  const h = raw as Record<string, unknown>;
  return {
    doctorName: typeof h.doctorName === 'string' ? h.doctorName : prev.doctorName,
    qualification:
      typeof h.qualification === 'string'
        ? h.qualification
        : typeof h.degree === 'string'
          ? h.degree
          : prev.qualification,
    specialization: typeof h.specialization === 'string' ? h.specialization : prev.specialization,
    department: typeof h.department === 'string' ? h.department : prev.department,
    college: typeof h.college === 'string' ? h.college : prev.college,
    bmdcRegNo: typeof h.bmdcRegNo === 'string' ? h.bmdcRegNo : prev.bmdcRegNo,
    clinicName: typeof h.clinicName === 'string' ? h.clinicName : prev.clinicName,
    clinicLogo: typeof h.clinicLogo === 'string' ? h.clinicLogo : prev.clinicLogo,
    address: typeof h.address === 'string' ? h.address : prev.address,
    phone: typeof h.phone === 'string' ? h.phone : prev.phone,
    email: typeof h.email === 'string' ? h.email : prev.email,
    visitTime: typeof h.visitTime === 'string' ? h.visitTime : prev.visitTime,
    dayOff: typeof h.dayOff === 'string' ? h.dayOff : prev.dayOff,
    doctorLogo: typeof h.doctorLogo === 'string' ? h.doctorLogo : prev.doctorLogo,
  };
}

export function coreApiUiPersistPrescriptionHeader(h: PrescriptionHeaderSettingsState): void {
  writeJson(HEADER_SETTINGS_KEY, h);
}

function mergePrimitiveFields<T extends Record<string, string | number | boolean>>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ...base };
  const p = patch as Record<string, unknown>;
  const out = { ...base };
  for (const k of Object.keys(base) as (keyof T)[]) {
    const key = String(k);
    const pv = p[key];
    const bv = base[k];
    if (typeof bv === 'number' && typeof pv === 'number' && Number.isFinite(pv)) out[k] = pv as T[keyof T];
    else if (typeof bv === 'boolean' && typeof pv === 'boolean') out[k] = pv as T[keyof T];
    else if (typeof bv === 'string' && typeof pv === 'string') out[k] = pv as T[keyof T];
  }
  return out;
}

export function coreApiUiMergePrescriptionPrintSetup<T extends Record<string, string | number | boolean>>(
  base: T
): T {
  const raw = readJson(PRINT_SETUP_KEY);
  return mergePrimitiveFields(base, raw);
}

export function coreApiUiPersistPrescriptionPrintSetup<T extends Record<string, string | number | boolean>>(
  p: T
): void {
  writeJson(PRINT_SETUP_KEY, p);
}

export function coreApiUiApplyDashboardPrintOverridesToPrintSetup<T extends Record<string, string | number | boolean>>(
  setup: T
): T {
  const raw = readJson(PRINT_SETUP_OVERRIDES_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return setup;
  const r = raw as Record<string, unknown>;
  const paper = r.paperSize;
  const size =
    paper === 'A5'
      ? { widthCm: 14.8, heightCm: 21.0 }
      : paper === 'Letter'
        ? { widthCm: 21.59, heightCm: 27.94 }
        : { widthCm: 21.0, heightCm: 29.7 };
  const next: Record<string, string | number | boolean> = { ...setup };
  next.pageWidthCm = size.widthCm;
  next.pageHeightCm = size.heightCm;
  const hh = r.headerHeight;
  if (typeof hh === 'number' && Number.isFinite(hh)) {
    const maybeCm = hh > 20 ? hh / 10 : hh;
    if (maybeCm > 0.5 && maybeCm < 20) next.headerHeightCm = maybeCm;
  }
  return { ...next } as T;
}

export function coreApiUiHydrateFullPrescriptionPrintSetup<T extends Record<string, string | number | boolean>>(
  base: T
): T {
  return coreApiUiApplyDashboardPrintOverridesToPrintSetup(coreApiUiMergePrescriptionPrintSetup(base));
}

export function coreApiUiLoadBillingProcedureList(defaults: string[]): string[] {
  const arr = readJson(BILLING_PROCEDURES_KEY);
  if (!Array.isArray(arr)) return defaults;
  const out = arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length ? out : defaults;
}
