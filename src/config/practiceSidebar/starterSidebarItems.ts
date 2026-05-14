/**
 * Dedicated sidebar for Starter workspace staff (DOCTOR, RECEPTIONIST, etc.).
 * Do not derive from clinic menu — this is the single source of truth for starter nav.
 */
export type StarterSidebarItem = {
  /** Stable id for dev assertions */
  id: string;
  pathSegment: string;
  label: string;
  iconClass: string;
  /** NavLink `end` prop (e.g. dashboard vs nested) */
  end?: boolean;
};

export const STARTER_SIDEBAR_ITEMS: readonly StarterSidebarItem[] = [
  { id: 'dashboard', pathSegment: 'overview', label: 'Dashboard', iconClass: 'fa-solid fa-grid-2', end: true },
  {
    id: 'patients',
    pathSegment: 'patients',
    label: 'Patients',
    iconClass: 'fa-solid fa-user-group',
  },
  { id: 'new_prescription', pathSegment: 'prescription', label: 'New Prescription', iconClass: 'fa-solid fa-prescription' },
  { id: 'all_prescriptions', pathSegment: 'prescriptions', label: 'All Prescriptions', iconClass: 'fa-solid fa-file-waveform' },
  { id: 'appointments', pathSegment: 'appointments', label: 'Appointments', iconClass: 'fa-solid fa-calendar-check' },
  { id: 'billing', pathSegment: 'billing', label: 'Billing', iconClass: 'fa-solid fa-credit-card' },
  { id: 'clinic_calendar', pathSegment: 'workspace-calendar', label: 'Clinic Calendar', iconClass: 'fa-solid fa-calendar-days' },
  { id: 'settings', pathSegment: 'workspace-settings', label: 'Profile / Settings', iconClass: 'fa-solid fa-gear' },
  { id: 'lab', pathSegment: 'lab', label: 'Lab Orders', iconClass: 'fa-solid fa-flask-vial' },
  { id: 'drugs', pathSegment: 'drugs', label: 'Drug Database', iconClass: 'fa-solid fa-capsules' },
] as const;
