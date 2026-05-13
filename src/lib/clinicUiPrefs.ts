/**
 * Client-only clinic preferences (working hours, default slot length).
 * Server `ClinicProfile` does not yet store these; persist per browser.
 */
export type ClinicUiPrefs = {
  workdayStart: string; // HH:mm
  workdayEnd: string;
  defaultAppointmentMinutes: number;
};

const defaultPrefs: ClinicUiPrefs = {
  workdayStart: '09:00',
  workdayEnd: '18:00',
  defaultAppointmentMinutes: 30,
};

function storageKey(clinicId: string | null | undefined): string {
  const id = (clinicId ?? 'default').trim() || 'default';
  return `baigdentpro:clinicUiPrefs:${id}`;
}

export function loadClinicUiPrefs(clinicId: string | null | undefined): ClinicUiPrefs {
  if (typeof window === 'undefined') return { ...defaultPrefs };
  try {
    const raw = window.localStorage.getItem(storageKey(clinicId));
    if (!raw) return { ...defaultPrefs };
    const o = JSON.parse(raw) as Partial<ClinicUiPrefs>;
    const start = typeof o.workdayStart === 'string' ? o.workdayStart : defaultPrefs.workdayStart;
    const end = typeof o.workdayEnd === 'string' ? o.workdayEnd : defaultPrefs.workdayEnd;
    const mins = typeof o.defaultAppointmentMinutes === 'number' && o.defaultAppointmentMinutes > 0
      ? Math.min(240, Math.round(o.defaultAppointmentMinutes))
      : defaultPrefs.defaultAppointmentMinutes;
    return { workdayStart: start, workdayEnd: end, defaultAppointmentMinutes: mins };
  } catch {
    return { ...defaultPrefs };
  }
}

export function saveClinicUiPrefs(clinicId: string | null | undefined, prefs: ClinicUiPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(clinicId), JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}
