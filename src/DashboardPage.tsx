import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PrescriptionPage } from './PrescriptionPage';
import api from './api';

interface Patient {
  id: string;
  regNo?: string;
  name: string;
  age?: string;
  gender?: string;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  occupation?: string;
  refBy?: string;
  createdAt: number;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  status: string;
  duration?: number; // minutes
  notes?: string;
  patientPhone?: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  diagnosis: string;
  drugs: DrugItem[];
}

interface DrugItem {
  id: string;
  brand: string;
  dose: string;
  duration: string;
  frequency: string;
  beforeFood: boolean;
  afterFood: boolean;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  patientName: string;
  total: number;
  paid: number;
  due: number;
  date: string;
  /** YYYY-MM-DD when set on server */
  dueDate?: string;
  status: string;
}

interface LabOrder {
  id: string;
  patientName: string;
  workType: string;
  status: string;
  orderDate: string;
}

interface MedicalHistory {
  bloodPressure?: boolean;
  heartProblems?: boolean;
  cardiacHtnMiPacemaker?: boolean;
  rheumaticFever?: boolean;
  diabetes?: boolean;
  pepticUlcer?: boolean;
  jaundice?: boolean;
  asthma?: boolean;
  tuberculosis?: boolean;
  kidneyDiseases?: boolean;
  aids?: boolean;
  thyroid?: boolean;
  hepatitis?: boolean;
  stroke?: boolean;
  bleedingDisorder?: boolean;
  otherDiseases?: string;
  isPregnant?: boolean;
  isLactating?: boolean;
  allergyPenicillin?: boolean;
  allergySulphur?: boolean;
  allergyAspirin?: boolean;
  allergyLocalAnaesthesia?: boolean;
  allergyOther?: string;
  takingAspirinBloodThinner?: boolean;
  takingAntihypertensive?: boolean;
  takingInhaler?: boolean;
  takingOther?: string;
  habitSmoking?: boolean;
  habitBetelLeaf?: boolean;
  habitAlcohol?: boolean;
  habitOther?: string;
  details?: string;
}

interface TreatmentPlan {
  id: string;
  toothNumber: string;
  diagnosis: string;
  procedure: string;
  cost: string;
  cc: string;
  cf: string;
  investigation: string;
  status: string;
}

interface TreatmentRecord {
  id: string;
  date: string;
  treatmentDone: string;
  cost: string;
  paid: string;
  due: string;
  patientSignature?: string;
  doctorSignature?: string;
}

interface PatientConsent {
  patientId: string;
  consentText: string;
  signatureName: string;
  signatureDate: string;
  agreed: boolean;
}

type YesNo = 'Yes' | 'No' | '';

interface PatientRecordFormData {
  regNo: string;
  name: string;
  occupation: string;
  mobile: string;
  address: string;
  refBy: string;
  age: string;

  // Medical history (extends existing modal data)
  bloodPressureReading: string; // "High/Low" numeric pair if provided
  femalePregnant: YesNo;

  // Diagnosis / plan
  diagnosisText: string;
  examinationNotes: string;

  // Treatment plan checklist
  treatmentChecklist: Record<
    | 'Examination'
    | 'XRayRVG'
    | 'Consultation'
    | 'Calculus'
    | 'Scaling'
    | 'Caries'
    | 'Filling'
    | 'DeepCaries'
    | 'RootCanal'
    | 'BDR_BDC_Fracture'
    | 'Missing'
    | 'Extraction_SurgicalExt'
    | 'Denture_Implant'
    | 'Mobility'
    | 'MucosalLesion'
    | 'Implant'
    | 'FixedOrthodontics'
    | 'TakingDrug_AspirinBloodThinner'
    | 'TakingDrug_Antihypertensive'
    | 'TakingDrug_Inhaler'
    | 'TakingDrug_Others',
    boolean
  >;

  takingDrugOtherText: string;

  // Cost & agreement
  costTotal: string;
  costPayerText: string; // "of myself/my ____"
  agreeToTreatment: boolean;
  explainedComplications: boolean;
  consentDate: string;
  signatureName: string;
}

interface Props {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userClinicId?: string;
  currentUserId?: string;
}

const STORAGE_KEYS = {
  patients: 'baigdentpro:patients',
  prescriptions: 'baigdentpro:prescriptions',
  appointments: 'baigdentpro:appointments',
  invoices: 'baigdentpro:invoices',
  labOrders: 'baigdentpro:labOrders',
};

const PATIENT_RECORD_FORM_KEY = (patientId: string) => `baigdentpro:patient-record-form:${patientId}`;

function getDefaultPatientRecordFormData(): PatientRecordFormData {
  return {
    regNo: '',
    name: '',
    occupation: '',
    mobile: '',
    address: '',
    refBy: '',
    age: '',
    bloodPressureReading: '',
    femalePregnant: '',
    diagnosisText: '',
    examinationNotes: '',
    treatmentChecklist: {
      Examination: false,
      XRayRVG: false,
      Consultation: false,
      Calculus: false,
      Scaling: false,
      Caries: false,
      Filling: false,
      DeepCaries: false,
      RootCanal: false,
      BDR_BDC_Fracture: false,
      Missing: false,
      Extraction_SurgicalExt: false,
      Denture_Implant: false,
      Mobility: false,
      MucosalLesion: false,
      Implant: false,
      FixedOrthodontics: false,
      TakingDrug_AspirinBloodThinner: false,
      TakingDrug_Antihypertensive: false,
      TakingDrug_Inhaler: false,
      TakingDrug_Others: false,
    },
    takingDrugOtherText: '',
    costTotal: '',
    costPayerText: '',
    agreeToTreatment: false,
    explainedComplications: false,
    consentDate: new Date().toISOString().slice(0, 10),
    signatureName: '',
  };
}

/** Calendar date in the user's local timezone (avoids UTC "today" drift vs appointments). */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettifyAppointmentStatus(status: string): string {
  const s = String(status || '').trim();
  if (!s) return 'Scheduled';
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapPatientFromApi(p: any): Patient {
  return {
    id: p.id,
    regNo: p.regNo ?? undefined,
    name: p.name,
    phone: p.phone ?? '',
    age: p.age != null ? String(p.age) : undefined,
    gender: p.gender ?? undefined,
    email: p.email ?? undefined,
    address: p.address ?? undefined,
    bloodGroup: p.bloodGroup ?? undefined,
    occupation: p.occupation ?? undefined,
    refBy: p.referredBy ?? undefined,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
  };
}

function mapAppointmentFromApi(a: any): Appointment {
  const d = a.date ? new Date(a.date) : new Date();
  const dateStr = formatLocalYMD(d);
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patient?.name ?? 'Unknown',
    patientPhone: a.patient?.phone ?? undefined,
    date: dateStr,
    time: a.time ?? '',
    type: a.type ?? 'Checkup',
    status: a.status ?? 'SCHEDULED',
    duration: a.duration ?? 30,
    notes: a.notes ?? undefined,
  };
}

function mapPrescriptionFromApi(p: any): Prescription {
  const d = p.date ? new Date(p.date) : new Date();
  const dateStr = formatLocalYMD(d);
  return {
    id: p.id,
    patientId: p.patientId,
    patientName: p.patient?.name ?? 'Unknown',
    date: dateStr,
    diagnosis: p.diagnosis ?? '',
    drugs: (p.items ?? []).map((i: any) => ({
      id: i.id ?? crypto.randomUUID(),
      brand: i.drugName ?? i.genericName ?? '',
      dose: i.dosage ?? '',
      duration: i.duration ?? '',
      frequency: i.frequency ?? '',
      beforeFood: i.beforeFood ?? false,
      afterFood: i.afterFood ?? true,
    })),
  };
}

function mapInvoiceFromApi(i: any): Invoice {
  const d = i.date ? new Date(i.date) : new Date();
  const dateStr = formatLocalYMD(d);
  const dueD = i.dueDate ? new Date(i.dueDate) : null;
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    patientName: i.patient?.name ?? 'Unknown',
    total: Number(i.total ?? 0),
    paid: Number(i.paid ?? 0),
    due: Number(i.due ?? 0),
    date: dateStr,
    dueDate: dueD ? formatLocalYMD(dueD) : undefined,
    status: i.status ?? 'PENDING',
  };
}

function invoiceIsOverdue(inv: Invoice): boolean {
  if (inv.status === 'PAID' || inv.due <= 0) return false;
  const todayYmd = formatLocalYMD(new Date());
  if (inv.dueDate) return inv.dueDate < todayYmd;
  return inv.status === 'OVERDUE';
}

function mapLabOrderFromApi(l: any): LabOrder {
  const d = l.orderDate ? new Date(l.orderDate) : new Date();
  const dateStr = formatLocalYMD(d);
  return {
    id: l.id,
    patientName: l.patient?.name ?? 'Unknown',
    workType: l.workType ?? '',
    status: l.status ?? 'PENDING',
    orderDate: dateStr,
  };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseAppointmentStartLocal(a: Appointment): Date {
  // Build a "local time" Date from the stored YYYY-MM-DD + HH:MM.
  // This avoids timezone-related day shifts.
  const [yStr, mStr, dStr] = a.date.split('-');
  const [hhStr, mmStr] = (a.time || '00:00').split(':');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const hh = parseInt(hhStr ?? '0', 10);
  const mm = parseInt(mmStr ?? '0', 10);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function formatICSDateTimeUTC(d: Date): string {
  // Example: 20260319T043000Z
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  // RFC5545 escaping: https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.11
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildAppointmentIcs(a: Appointment): string {
  const start = parseAppointmentStartLocal(a);
  const durationMin = a.duration ?? 30;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const dtStamp = formatICSDateTimeUTC(new Date());
  const dtStart = formatICSDateTimeUTC(start);
  const dtEnd = formatICSDateTimeUTC(end);

  const summary = `Appointment with ${a.patientName}`;

  const descriptionLines = [
    `Type: ${a.type ?? '-'}`,
    `Patient: ${a.patientName ?? '-'}`,
    a.patientPhone ? `Phone: ${a.patientPhone}` : null,
    a.notes ? `Notes: ${a.notes}` : null,
  ].filter(Boolean) as string[];

  const icsStatus =
    String(a.status ?? '').toUpperCase() === 'CANCELLED' || String(a.status ?? '').toUpperCase() === 'CANCELED'
      ? 'CANCELLED'
      : 'CONFIRMED';

  // Use CRLF as per ICS spec.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BaigMed//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a.id}@baigmed`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `STATUS:${icsStatus}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function downloadAppointmentIcs(a: Appointment) {
  if (typeof window === 'undefined') return;
  const ics = buildAppointmentIcs(a);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safePatient = (a.patientName || 'patient').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const safeDate = (a.date || 'date').replace(/[^0-9]+/g, '');

  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${safePatient}-${safeDate}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Ensure we don't leak object URLs.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatGoogleDateTimeUTC(d: Date): string {
  // Example: 20260319T043000Z
  return formatICSDateTimeUTC(d);
}

function getGoogleCalendarUrl(a: Appointment): string {
  const start = parseAppointmentStartLocal(a);
  const durationMin = a.duration ?? 30;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const text = `Appointment: ${a.patientName}`;
  const detailsLines = [
    `Type: ${a.type ?? '-'}`,
    `Patient: ${a.patientName ?? '-'}`,
    a.patientPhone ? `Phone: ${a.patientPhone}` : null,
    a.notes ? `Notes: ${a.notes}` : null,
  ].filter(Boolean) as string[];

  const details = detailsLines.join('\n');
  const dates = `${formatGoogleDateTimeUTC(start)}/${formatGoogleDateTimeUTC(end)}`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', text);
  url.searchParams.set('details', details);
  url.searchParams.set('dates', dates);
  // Add a simple default; user can edit before saving.
  url.searchParams.set('sprop', '');
  url.searchParams.set('sf', 'true');
  return url.toString();
}

const MEDICAL_HISTORY_KEY = (patientId: string) => `baigdentpro:medicalHistory:${patientId}`;
const DENTAL_CHART_KEY = (patientId: string) => `baigdentpro:dentalChart:${patientId}`;
const TREATMENT_PLANS_KEY = (patientId: string) => `baigdentpro:treatmentPlans:${patientId}`;
const TREATMENT_RECORDS_KEY = (patientId: string) => `baigdentpro:treatmentRecords:${patientId}`;
const CONSENT_KEY = (patientId: string) => `baigdentpro:consent:${patientId}`;
const BILLING_PROCEDURES_KEY = 'baigdentpro:billingProcedures';

/** Remove browser-stored profile data for a patient (offline / after local delete). */
function clearPatientLocalStorage(patientId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PATIENT_RECORD_FORM_KEY(patientId));
    localStorage.removeItem(MEDICAL_HISTORY_KEY(patientId));
    localStorage.removeItem(DENTAL_CHART_KEY(patientId));
    localStorage.removeItem(TREATMENT_PLANS_KEY(patientId));
    localStorage.removeItem(TREATMENT_RECORDS_KEY(patientId));
    localStorage.removeItem(CONSENT_KEY(patientId));
  } catch {
    /* ignore */
  }
}

type PatientSortKey = 'name' | 'regNo' | 'phone' | 'createdAt';

/** Patient profile card: all checkbox flags in the same order as the Medical History modal. */
const MEDICAL_HISTORY_DISPLAY_ORDER: ReadonlyArray<{
  key: keyof MedicalHistory;
  label: string;
  tagClass?: string;
}> = [
  { key: 'bloodPressure', label: 'Blood Pressure' },
  { key: 'heartProblems', label: 'Heart Problems' },
  { key: 'cardiacHtnMiPacemaker', label: 'Cardiac (HTN/MI/Pacemaker)' },
  { key: 'rheumaticFever', label: 'Rheumatic Fever' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'pepticUlcer', label: 'Peptic Ulcer / Acidity' },
  { key: 'jaundice', label: 'Jaundice / Liver' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'kidneyDiseases', label: 'Kidney Diseases' },
  { key: 'aids', label: 'AIDS' },
  { key: 'thyroid', label: 'Thyroid' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'stroke', label: 'Stroke' },
  { key: 'bleedingDisorder', label: 'Bleeding Disorder' },
  { key: 'isPregnant', label: 'Pregnant', tagClass: 'pregnant' },
  { key: 'isLactating', label: 'Lactating', tagClass: 'pregnant' },
  { key: 'allergyPenicillin', label: 'Penicillin Allergy', tagClass: 'allergy' },
  { key: 'allergySulphur', label: 'Sulphur Allergy', tagClass: 'allergy' },
  { key: 'allergyAspirin', label: 'Aspirin Allergy', tagClass: 'allergy' },
  { key: 'allergyLocalAnaesthesia', label: 'LA Allergy', tagClass: 'allergy' },
  { key: 'takingAspirinBloodThinner', label: 'Blood Thinner', tagClass: 'drug' },
  { key: 'takingAntihypertensive', label: 'Antihypertensive', tagClass: 'drug' },
  { key: 'takingInhaler', label: 'Inhaler', tagClass: 'drug' },
  { key: 'habitSmoking', label: 'Smoking', tagClass: 'habit' },
  { key: 'habitBetelLeaf', label: 'Betel Leaf', tagClass: 'habit' },
  { key: 'habitAlcohol', label: 'Alcohol', tagClass: 'habit' },
];

/** Free-text fields from the same modal (shown when not empty). */
const MEDICAL_HISTORY_TEXT_DISPLAY: ReadonlyArray<{ key: keyof MedicalHistory; title: string }> = [
  { key: 'otherDiseases', title: 'Other diseases' },
  { key: 'allergyOther', title: 'Other allergies' },
  { key: 'takingOther', title: 'Other medications' },
  { key: 'habitOther', title: 'Other habits' },
  { key: 'details', title: 'Additional details' },
];

function hasDisplayedMedicalHistory(mh: MedicalHistory): boolean {
  const anyFlag = MEDICAL_HISTORY_DISPLAY_ORDER.some(({ key }) => Boolean(mh[key]));
  const anyText = MEDICAL_HISTORY_TEXT_DISPLAY.some(({ key }) => {
    const v = mh[key];
    return typeof v === 'string' && v.trim().length > 0;
  });
  return anyFlag || anyText;
}

const DIAGNOSIS_OPTIONS = [
  'Examination', 'X-Ray/RVG', 'Calculus', 'Caries', 'Deep Caries',
  'BDR/BDC/Fracture', 'Missing', 'Mobility', 'Mucosal Lesion'
];

const TREATMENT_OPTIONS = [
  'Consultation', 'Scaling', 'Filling', 'Root Canal',
  'Extraction/Surgical Ext', 'Partial/Complete Denture/Implant',
  'Implant', 'Fixed Orthodontics'
];

const DRUG_DATABASE = [
  { company: 'GSK', generic: 'Amoxicillin', brand: 'Amoxil', strength: '250mg, 500mg' },
  { company: 'Pfizer', generic: 'Azithromycin', brand: 'Zithromax', strength: '250mg, 500mg' },
  { company: 'Abbott', generic: 'Metronidazole', brand: 'Flagyl', strength: '200mg, 400mg' },
  { company: 'Sun', generic: 'Ibuprofen', brand: 'Brufen', strength: '200mg, 400mg, 600mg' },
  { company: 'Cipla', generic: 'Paracetamol', brand: 'Crocin', strength: '500mg, 650mg' },
  { company: 'Mankind', generic: 'Omeprazole', brand: 'Omez', strength: '20mg' },
  { company: 'Mankind', generic: 'Pantoprazole', brand: 'Pan', strength: '40mg' },
  { company: 'Lupin', generic: 'Cefixime', brand: 'Taxim', strength: '200mg, 400mg' },
  { company: 'Novartis', generic: 'Cetirizine', brand: 'Cetrizet', strength: '5mg, 10mg' },
  { company: 'Alkem', generic: 'Domperidone', brand: 'Domstal', strength: '10mg' },
  { company: 'Cipla', generic: 'Aceclofenac', brand: 'Hifenac', strength: '100mg' },
  { company: 'Sun', generic: 'Nimesulide', brand: 'Nicip', strength: '100mg' },
  { company: 'GSK', generic: 'Diclofenac', brand: 'Cataflam', strength: '25mg, 50mg' },
  { company: 'Cipla', generic: 'Montelukast', brand: 'Montair', strength: '4mg, 5mg, 10mg' },
  { company: 'Dr Reddy', generic: 'Ferrous Sulfate', brand: 'Ferra', strength: '325mg' },
];

const DEFAULT_DENTAL_PROCEDURES = [
  'Consultation', 'Scaling & Polishing', 'Filling (Composite)', 'Filling (Amalgam)',
  'Root Canal Treatment', 'Extraction', 'Surgical Extraction', 'Crown', 'Bridge',
  'Denture (Complete)', 'Denture (Partial)', 'Implant', 'Teeth Whitening',
  'Orthodontic Consultation', 'Braces Fitting', 'Retainer', 'Night Guard',
  'X-Ray (IOPA)', 'X-Ray (OPG)', 'Fluoride Treatment', 'Sealant Application',
];

const TOOTH_CHART_FDI = {
  permanent: [
    { quadrant: 'Upper Right', numbers: [18, 17, 16, 15, 14, 13, 12, 11] },
    { quadrant: 'Upper Left', numbers: [21, 22, 23, 24, 25, 26, 27, 28] },
    { quadrant: 'Lower Right', numbers: [48, 47, 46, 45, 44, 43, 42, 41] },
    { quadrant: 'Lower Left', numbers: [31, 32, 33, 34, 35, 36, 37, 38] },
  ],
  deciduous: [
    { quadrant: 'Upper Right', numbers: [55, 54, 53, 52, 51] },
    { quadrant: 'Upper Left', numbers: [61, 62, 63, 64, 65] },
    { quadrant: 'Lower Right', numbers: [85, 84, 83, 82, 81] },
    { quadrant: 'Lower Left', numbers: [71, 72, 73, 74, 75] },
  ],
};

const TOOTH_CHART_UNIVERSAL = {
  permanent: [
    { quadrant: 'Upper Right', numbers: [1, 2, 3, 4, 5, 6, 7, 8] },
    { quadrant: 'Upper Left', numbers: [9, 10, 11, 12, 13, 14, 15, 16] },
    { quadrant: 'Lower Right', numbers: [32, 31, 30, 29, 28, 27, 26, 25] },
    { quadrant: 'Lower Left', numbers: [24, 23, 22, 21, 20, 19, 18, 17] },
  ],
};

const TOOTH_CHART = {
  permanent: [
    { quadrant: 'Upper Right', numbers: [18, 17, 16, 15, 14, 13, 12, 11] },
    { quadrant: 'Upper Left', numbers: [21, 22, 23, 24, 25, 26, 27, 28] },
    { quadrant: 'Lower Right', numbers: [48, 47, 46, 45, 44, 43, 42, 41] },
    { quadrant: 'Lower Left', numbers: [31, 32, 33, 34, 35, 36, 37, 38] },
  ],
  deciduous: [
    { quadrant: 'Upper Right', numbers: [55, 54, 53, 52, 51] },
    { quadrant: 'Upper Left', numbers: [61, 62, 63, 64, 65] },
    { quadrant: 'Lower Right', numbers: [85, 84, 83, 82, 81] },
    { quadrant: 'Lower Left', numbers: [71, 72, 73, 74, 75] },
  ],
};

type NavSection = 'dashboard' | 'patients' | 'patient-detail' | 'prescription' | 'prescriptions-list' | 
  'appointments' | 'billing' | 'lab' | 'drugs' | 'sms' | 'settings' | 'clinic-admin' | 'super-admin';

type ServerDashboardStats = {
  totalPatients: number;
  newPatientsThisMonth: number;
  todayAppointments: number;
  upcomingAppointments: number;
  monthlyRevenue: number;
  pendingDue: number;
  pendingLabOrders: number;
  prescriptionsThisMonth: number;
  pendingInvoicesCount: number;
  /** Added in API v2; older servers may omit (we fall back to client count). */
  overdueInvoicesCount?: number;
};

export const DashboardPage: React.FC<Props> = ({
  onLogout,
  userName = 'Doctor',
  userRole,
  userClinicId,
  currentUserId,
}) => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  /** When set, patient list uses server search results (API mode). */
  const [patientsSearchOverride, setPatientsSearchOverride] = useState<Patient[] | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [billingInvoiceFilter, setBillingInvoiceFilter] = useState<'all' | 'open' | 'overdue' | 'paid'>('all');
  const [appointmentScheduleFilter, setAppointmentScheduleFilter] = useState<'upcoming' | 'today' | 'week' | 'all'>('upcoming');
  const [patientSortKey, setPatientSortKey] = useState<PatientSortKey>('name');
  const [patientSortDir, setPatientSortDir] = useState<'asc' | 'desc'>('asc');
  const [patientListPage, setPatientListPage] = useState(1);
  const [patientListPageSize, setPatientListPageSize] = useState(25);
  const [showNotice, setShowNotice] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  /** SMS compose (dashboard → Twilio via /api/communication) */
  const [smsComposePatientId, setSmsComposePatientId] = useState('');
  const [smsComposeMessage, setSmsComposeMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  // Settings persistence (used by PrescriptionPage header/print templates)
  const HEADER_SETTINGS_STORAGE_KEY = 'baigdentpro:headerSettings';
  const PRINT_SETUP_OVERRIDES_KEY = 'baigdentpro:printSetupOverrides';

  const [dashboardHeaderDraft, setDashboardHeaderDraft] = useState({
    clinicName: '',
    address: '',
    phone: '',
    clinicLogo: '',
    doctorName: userName,
    degree: '',
    specialization: '',
    doctorLogo: '',
  });

  const [dashboardPrintDraft, setDashboardPrintDraft] = useState({
    paperSize: 'A4' as 'A4' | 'A5' | 'Letter',
    // Stored in the dashboard UI as a raw number; PrescriptionPage will interpret/validate.
    headerHeight: 100,
  });

  useEffect(() => {
    // Load persisted dashboard settings (so they affect other pages/printing).
    try {
      const raw = localStorage.getItem(HEADER_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          clinicName: string;
          address: string;
          phone: string;
          clinicLogo: string;
          doctorName: string;
          qualification: string;
          specialization: string;
          doctorLogo: string;
        }>;
        setDashboardHeaderDraft((prev) => ({
          ...prev,
          clinicName: parsed.clinicName ?? prev.clinicName,
          address: parsed.address ?? prev.address,
          phone: parsed.phone ?? prev.phone,
          clinicLogo: parsed.clinicLogo ?? prev.clinicLogo,
          doctorName: parsed.doctorName ?? prev.doctorName,
          degree: parsed.qualification ?? prev.degree,
          specialization: parsed.specialization ?? prev.specialization,
          doctorLogo: parsed.doctorLogo ?? prev.doctorLogo,
        }));
      }
    } catch {
      // ignore
    }

    try {
      const raw = localStorage.getItem(PRINT_SETUP_OVERRIDES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{ paperSize: 'A4' | 'A5' | 'Letter'; headerHeight: number }>;
        setDashboardPrintDraft((prev) => ({
          ...prev,
          paperSize: parsed.paperSize ?? prev.paperSize,
          headerHeight: typeof parsed.headerHeight === 'number' ? parsed.headerHeight : prev.headerHeight,
        }));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);
  /** Server-aggregated KPIs (aligned with /api/dashboard/stats — closer to how PMS leaders report). */
  const [dashboardApiStats, setDashboardApiStats] = useState<ServerDashboardStats | null>(null);
  const [dashboardRecentPatients, setDashboardRecentPatients] = useState<Patient[] | null>(null);
  const [dashboardRevenueChart, setDashboardRevenueChart] = useState<{ date: string; revenue: number }[]>([]);
  const [dashboardAppointmentChart, setDashboardAppointmentChart] = useState<{ date: string; count: number }[]>([]);
  const [superAdminStats, setSuperAdminStats] = useState<any>(null);
  const [superAdminClinics, setSuperAdminClinics] = useState<any[]>([]);
  const [superAdminRevenue, setSuperAdminRevenue] = useState<any[]>([]);
  const [superAdminUtilization, setSuperAdminUtilization] = useState<any[]>([]);
  const [superAdminLogs, setSuperAdminLogs] = useState<any[]>([]);
  const [superAdminDoctors, setSuperAdminDoctors] = useState<any[]>([]);
  const [superAdminPatients, setSuperAdminPatients] = useState<any[]>([]);
  const [superAdminPrescriptions, setSuperAdminPrescriptions] = useState<any[]>([]);
  const [superAdminDoctorSearch, setSuperAdminDoctorSearch] = useState('');
  const [superAdminPatientSearch, setSuperAdminPatientSearch] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminTab, setSuperAdminTab] = useState<
    | 'overview'
    | 'approvals'
    | 'clinics'
    | 'doctor-control'
    | 'patient-control'
    | 'prescription-control'
    | 'revenue'
    | 'utilization'
    | 'logs'
  >('overview');
  const [superAdminPending, setSuperAdminPending] = useState<any[]>([]);

  const [clinicAdminUsers, setClinicAdminUsers] = useState<any[]>([]);
  const [clinicAdminTotal, setClinicAdminTotal] = useState(0);
  const [clinicAdminLoading, setClinicAdminLoading] = useState(false);
  const [clinicAdminSearchInput, setClinicAdminSearchInput] = useState('');
  const [clinicAdminSearch, setClinicAdminSearch] = useState('');
  const [clinicAdminPage, setClinicAdminPage] = useState(1);
  const [adminFilterClinicId, setAdminFilterClinicId] = useState('');
  const [adminClinicOptions, setAdminClinicOptions] = useState<{ id: string; name: string }[]>([]);
  const [newStaffForm, setNewStaffForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'DOCTOR' as 'DOCTOR' | 'CLINIC_ADMIN',
    clinicId: '',
  });
  
  // Form states
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '', occupation: '', refBy: '' });
  const [appointmentForm, setAppointmentForm] = useState({ patientId: '', date: '', time: '', type: 'Checkup' });
  const [prescriptionForm, setPrescriptionForm] = useState({ patientId: '', diagnosis: '', advice: '', drugs: [] as DrugItem[] });
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    items: [] as { description: string; amount: number }[],
    discount: 0,
    dueDate: '',
  });
  const [labForm, setLabForm] = useState({ patientId: '', workType: 'Crown', description: '', toothNumber: '', shade: '' });
  const [billingProcedures, setBillingProcedures] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_DENTAL_PROCEDURES;
    try {
      const raw = window.localStorage.getItem(BILLING_PROCEDURES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
          return parsed;
        }
      }
    } catch {
      // ignore and fall back
    }
    return DEFAULT_DENTAL_PROCEDURES;
  });
  const [newBillingProcedure, setNewBillingProcedure] = useState('');
  const [customLineDescription, setCustomLineDescription] = useState('');
  const [customLineAmount, setCustomLineAmount] = useState<string>('');

  // Drug form
  const [drugForm, setDrugForm] = useState({ brand: '', dose: '', duration: '', frequency: '1-0-1', beforeFood: false, afterFood: true });
  const [drugSearch, setDrugSearch] = useState('');
  
  // Selected teeth for dental chart
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  // Patient profile states
  const [patientProfileTab, setPatientProfileTab] = useState<'info' | 'treatment' | 'ledger' | 'consent' | 'record-form'>('info');
  const [toothNumberingSystem, setToothNumberingSystem] = useState<'fdi' | 'universal'>('fdi');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({});
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [consent, setConsent] = useState<PatientConsent | null>(null);

  const [patientRecordForm, setPatientRecordForm] = useState<PatientRecordFormData>(() =>
    getDefaultPatientRecordFormData()
  );

  const getPatientRecordFormPrintHtml = useCallback(
    (patientNameForTitle: string) => {
      const esc = (s: any) =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const yesNo = (v: YesNo) => (v === 'Yes' ? 'Yes' : v === 'No' ? 'No' : '—');
      const tick = (b: boolean) => (b ? '☑' : '☐');
      const mh = medicalHistory || {};

      const checklist = patientRecordForm.treatmentChecklist;

      const diseases: Array<[string, boolean]> = [
        ['Blood Pressure (High/Low)', Boolean(mh.bloodPressure)],
        ['Heart Problems (e.g. Rheumatic Fever)', Boolean(mh.heartProblems) || Boolean(mh.rheumaticFever)],
        ['Diabetes', Boolean(mh.diabetes)],
        ['Peptic Ulcer / Acidity', Boolean(mh.pepticUlcer)],
        ['Jaundice/Liver Diseases', Boolean(mh.jaundice) || Boolean(mh.hepatitis)],
        ['Asthma', Boolean(mh.asthma)],
        ['Tuberculosis', Boolean(mh.tuberculosis)],
        ['Kidney Diseases', Boolean(mh.kidneyDiseases)],
        ['AIDS', Boolean(mh.aids)],
        ['Thyroid', Boolean(mh.thyroid)],
        ['Other Problems (Please Specify)', Boolean(mh.otherDiseases)],
      ];

      const allergies: Array<[string, boolean]> = [
        ['Penicillin', Boolean(mh.allergyPenicillin)],
        ['Sulphur', Boolean(mh.allergySulphur)],
        ['Aspirin', Boolean(mh.allergyAspirin)],
        ['Local Anaesthesia', Boolean(mh.allergyLocalAnaesthesia)],
        ['Others (Please Specify)', Boolean(mh.allergyOther)],
      ];

      const habits: Array<[string, boolean]> = [
        ['Smoking', Boolean(mh.habitSmoking)],
        ['Chewing Betel Leaf/Nut', Boolean(mh.habitBetelLeaf)],
        ['Alcohol', Boolean(mh.habitAlcohol)],
        ['Others (Please Specify)', Boolean(mh.habitOther)],
      ];

      const planLines: Array<[string, boolean]> = [
        ['Examination', checklist.Examination],
        ['X-Ray/RVG', checklist.XRayRVG],
        ['Consultation', checklist.Consultation],
        ['Calculus', checklist.Calculus],
        ['Scaling', checklist.Scaling],
        ['Caries', checklist.Caries],
        ['Filling', checklist.Filling],
        ['Deep Caries', checklist.DeepCaries],
        ['Root Canal', checklist.RootCanal],
        ['BDR/BDC/Fracture', checklist.BDR_BDC_Fracture],
        ['Missing', checklist.Missing],
        ['Extraction/Surgical Ext', checklist.Extraction_SurgicalExt],
        ['Partial/Complete Denture/Implant', checklist.Denture_Implant],
        ['Mobility', checklist.Mobility],
        ['Mucosal Lesion', checklist.MucosalLesion],
        ['Implant', checklist.Implant],
        ['Fixed Orthodontics', checklist.FixedOrthodontics],
      ];

      const takingDrugLines: Array<[string, boolean]> = [
        ['Aspirin/Blood Thinner', checklist.TakingDrug_AspirinBloodThinner],
        ['Antihypertensive', checklist.TakingDrug_Antihypertensive],
        ['Inhaler', checklist.TakingDrug_Inhaler],
        ['Others', checklist.TakingDrug_Others],
      ];

      const twoCol = (pairs: Array<[string, boolean]>) => {
        const left: string[] = [];
        const right: string[] = [];
        pairs.forEach((p, idx) => (idx % 2 === 0 ? left : right).push(`<div class="check">${tick(p[1])} ${esc(p[0])}</div>`));
        return `<div class="two-col"><div>${left.join('')}</div><div>${right.join('')}</div></div>`;
      };

      return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Edit Patient Profile - ${esc(patientNameForTitle)}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family: Arial, sans-serif; color:#000; margin:0; background:#fff;}
    .page{max-width: 900px; margin: 0 auto; padding: 18px;}
    h1{font-size:18px; margin:0 0 10px; text-align:center; letter-spacing:0.3px;}
    h2{font-size:14px; margin:16px 0 8px; border-bottom:1px solid #000; padding-bottom:4px;}
    .grid{display:grid; grid-template-columns: 1fr 1fr; gap:10px 14px;}
    .field{border:1px solid #000; padding:8px; min-height:40px;}
    .label{font-size:11px; font-weight:bold; margin-bottom:4px;}
    .val{font-size:13px; white-space:pre-wrap;}
    .two-col{display:grid; grid-template-columns: 1fr 1fr; gap:8px 24px;}
    .check{font-size:13px; padding:2px 0;}
    .small{font-size:12px;}
    .box{border:1px solid #000; padding:10px;}
    .sign-grid{display:grid; grid-template-columns: 1fr 1fr; gap:10px 14px;}
    .line{border-bottom:1px solid #000; min-height:18px;}
    @media print{
      .page{padding:0.6cm;}
    }
  </style>
</head>
<body>
  <div class="page">
    <h1>PATIENT RECORD FORM</h1>

    <div class="grid">
      <div class="field"><div class="label">Reg. No.</div><div class="val">${esc(patientRecordForm.regNo)}</div></div>
      <div class="field"><div class="label">Name</div><div class="val">${esc(patientRecordForm.name)}</div></div>
      <div class="field"><div class="label">Occupation</div><div class="val">${esc(patientRecordForm.occupation)}</div></div>
      <div class="field"><div class="label">Mob.</div><div class="val">${esc(patientRecordForm.mobile)}</div></div>
      <div class="field"><div class="label">Address</div><div class="val">${esc(patientRecordForm.address)}</div></div>
      <div class="field"><div class="label">Ref.: ....</div><div class="val">${esc(patientRecordForm.refBy)}</div></div>
      <div class="field"><div class="label">Age</div><div class="val">${esc(patientRecordForm.age)}</div></div>
      <div class="field"><div class="label">Blood Pressure (High/Low)</div><div class="val">${esc(patientRecordForm.bloodPressureReading)}</div></div>
    </div>

    <h2>MEDICAL HISTORY</h2>
    <div class="box">
      <div class="small"><b>Diseases Like</b></div>
      ${twoCol(diseases)}

      <div style="margin-top:10px" class="small"><b>Other Problems (Please Specify)</b></div>
      <div class="val">${esc(mh.otherDiseases || '')}</div>

      <div style="margin-top:10px" class="small"><b>If Female, Are you pregnant?</b> ${esc(yesNo(patientRecordForm.femalePregnant))}</div>

      <div style="margin-top:10px" class="small"><b>Allergic to</b></div>
      ${twoCol(allergies)}
      <div class="val">${esc(mh.allergyOther || '')}</div>

      <div style="margin-top:10px" class="small"><b>Bad Habit Like</b></div>
      ${twoCol(habits)}
      <div class="val">${esc(mh.habitOther || '')}</div>
    </div>

    <h2>DIAGNOSIS</h2>
    <div class="box"><div class="val">${esc(patientRecordForm.diagnosisText)}</div></div>

    <h2>TREATMENT PLAN</h2>
    <div class="box">
      ${twoCol(planLines)}
      <div style="margin-top:10px" class="small"><b>Taking Drug</b></div>
      ${twoCol(takingDrugLines)}
      <div class="val">${esc(patientRecordForm.takingDrugOtherText)}</div>

      <div style="margin-top:10px" class="small"><b>Examination</b></div>
      <div class="val">${esc(patientRecordForm.examinationNotes)}</div>
    </div>

    <h2>COST</h2>
    <div class="box">
      <div class="grid">
        <div class="field"><div class="label">Total=</div><div class="val">${esc(patientRecordForm.costTotal)}</div></div>
        <div class="field"><div class="label">of myself/my.</div><div class="val">${esc(patientRecordForm.costPayerText)}</div></div>
      </div>
    </div>

    <h2>CONSENT</h2>
    <div class="box">
      <div class="check">${tick(patientRecordForm.agreeToTreatment)} I do hereby agree to undergo necessary treatment</div>
      <div class="check">${tick(patientRecordForm.explainedComplications)} The procedure & the potential complications (if any) were explained to me.</div>
      <div style="margin-top:10px" class="sign-grid">
        <div>
          <div class="small"><b>Date:</b> ${esc(patientRecordForm.consentDate)}</div>
          <div class="line"></div>
        </div>
        <div>
          <div class="small"><b>Signature/Name:</b> ${esc(patientRecordForm.signatureName)}</div>
          <div class="line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    },
    [medicalHistory, patientRecordForm]
  );

  const openPatientRecordFormPrint = useCallback(() => {
    if (!selectedPatient) return;
    // Always save before printing so data isn't lost
    savePatientRecordForm(selectedPatient.id, patientRecordForm);
    const html = getPatientRecordFormPrintHtml(selectedPatient.name || 'Patient');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      showToast('Popups blocked. Allow popups to print/save PDF.');
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [selectedPatient, patientRecordForm, getPatientRecordFormPrintHtml]);
  
  // Modals
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [showTreatmentRecordModal, setShowTreatmentRecordModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [editingRecord, setEditingRecord] = useState<TreatmentRecord | null>(null);
  // Payment record modal inputs (used for auto-calculating Due)
  const [paymentCostInput, setPaymentCostInput] = useState<string>('0');
  const [paymentPaidInput, setPaymentPaidInput] = useState<string>('0');

  const paymentDuePreview = (() => {
    const costNum = parseFloat(paymentCostInput) || 0;
    const paidNum = parseFloat(paymentPaidInput) || 0;
    const dueNum = costNum - paidNum;
    return (dueNum > 0 ? dueNum : 0).toFixed(2);
  })();

  const loadData = useCallback(async () => {
    if (!api.getToken()) {
      setDashboardApiStats(null);
      setDashboardRecentPatients(null);
      setDashboardRevenueChart([]);
      setDashboardAppointmentChart([]);
      try {
        setPatients(JSON.parse(localStorage.getItem(STORAGE_KEYS.patients) || '[]'));
        setPrescriptions(JSON.parse(localStorage.getItem(STORAGE_KEYS.prescriptions) || '[]'));
        setAppointments(JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || '[]'));
        setInvoices(JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) || '[]'));
        setLabOrders(JSON.parse(localStorage.getItem(STORAGE_KEYS.labOrders) || '[]'));
      } catch (e) {
        console.error('Error loading data:', e);
      }
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setApiError(null);
    try {
      const [patientsRes, appointmentsRes, prescriptionsRes, invoicesRes, labRes] = await Promise.all([
        api.patients.list({ limit: 500 }),
        api.appointments.list(),
        api.prescriptions.list({ page: 1, limit: 500 }),
        api.invoices.list({ page: 1, limit: 500 }),
        api.lab.list({ page: 1, limit: 500 }),
      ]);
      const patientsList = (patientsRes as { patients: any[] }).patients ?? [];
      const appointmentsList = Array.isArray(appointmentsRes) ? appointmentsRes : [];
      const prescriptionsList = (prescriptionsRes as { prescriptions: any[] }).prescriptions ?? [];
      const invoicesList = (invoicesRes as { invoices: any[] }).invoices ?? [];
      const labList = (labRes as { labOrders: any[] }).labOrders ?? [];
      setPatients(patientsList.map(mapPatientFromApi));
      setAppointments(appointmentsList.map(mapAppointmentFromApi));
      setPrescriptions(prescriptionsList.map(mapPrescriptionFromApi));
      setInvoices(invoicesList.map(mapInvoiceFromApi));
      setLabOrders(labList.map(mapLabOrderFromApi));

      const [dashStats, dashRecent, revC, apptC] = await Promise.all([
        api.dashboard.stats().catch(() => null),
        api.dashboard.recentPatients().catch(() => null),
        api.dashboard.revenueChart('daily').catch(() => null),
        api.dashboard.appointmentChart().catch(() => null),
      ]);
      if (dashStats && typeof dashStats === 'object') {
        setDashboardApiStats(dashStats as ServerDashboardStats);
      } else {
        setDashboardApiStats(null);
      }
      setDashboardRecentPatients(
        Array.isArray(dashRecent) ? dashRecent.map(mapPatientFromApi) : null
      );
      setDashboardRevenueChart(Array.isArray(revC) ? revC : []);
      setDashboardAppointmentChart(Array.isArray(apptC) ? apptC : []);
    } catch (e: any) {
      console.error('API load error:', e);
      setApiError(e?.message ?? 'Failed to load data');
      setDashboardApiStats(null);
      setDashboardRecentPatients(null);
      setDashboardRevenueChart([]);
      setDashboardAppointmentChart([]);
      try {
        setPatients(JSON.parse(localStorage.getItem(STORAGE_KEYS.patients) || '[]'));
        setPrescriptions(JSON.parse(localStorage.getItem(STORAGE_KEYS.prescriptions) || '[]'));
        setAppointments(JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || '[]'));
        setInvoices(JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) || '[]'));
        setLabOrders(JSON.parse(localStorage.getItem(STORAGE_KEYS.labOrders) || '[]'));
      } catch {
        // keep empty
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!showTreatmentRecordModal) return;
    setPaymentCostInput(editingRecord?.cost ?? '0');
    setPaymentPaidInput(editingRecord?.paid ?? '0');
  }, [showTreatmentRecordModal, editingRecord?.id]);

  useEffect(() => {
    if (activeNav !== 'super-admin' || userRole !== 'SUPER_ADMIN' || !api.getToken()) return;
    let cancelled = false;
    setSuperAdminLoading(true);
    (async () => {
      try {
        const [statsRes, clinicsRes, revenueRes, utilRes, logsRes] = await Promise.all([
          api.superAdmin.stats(),
          api.superAdmin.clinics({ limit: 100 }),
          api.superAdmin.revenueByBranch(),
          api.superAdmin.chairUtilization(),
          api.superAdmin.activityLogs({ limit: 100 }),
        ]);
        if (cancelled) return;
        setSuperAdminStats(statsRes);
        setSuperAdminClinics(clinicsRes.clinics ?? []);
        setSuperAdminRevenue(revenueRes.branches ?? []);
        setSuperAdminUtilization(utilRes.utilization ?? []);
        setSuperAdminLogs(logsRes.logs ?? []);
      } catch (e) {
        if (!cancelled) showToast('Failed to load super admin data');
      } finally {
        if (!cancelled) setSuperAdminLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeNav, userRole]);

  useEffect(() => {
    if (activeNav !== 'super-admin' || userRole !== 'SUPER_ADMIN' || !api.getToken()) return;
    if (superAdminTab !== 'approvals') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.superAdmin.pendingSignups();
        if (!cancelled) setSuperAdminPending(res.pending ?? []);
      } catch {
        if (!cancelled) showToast('Failed to load pending signups');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNav, userRole, superAdminTab]);

  useEffect(() => {
    if (activeNav !== 'super-admin' || userRole !== 'SUPER_ADMIN' || !api.getToken()) return;
    let cancelled = false;
    (async () => {
      try {
        if (superAdminTab === 'doctor-control') {
          const res = await api.superAdmin.doctors({ search: superAdminDoctorSearch, limit: 200 });
          if (!cancelled) setSuperAdminDoctors(res.doctors ?? []);
          return;
        }
        if (superAdminTab === 'patient-control') {
          const res = await api.superAdmin.patients({ search: superAdminPatientSearch, limit: 200 });
          if (!cancelled) setSuperAdminPatients(res.patients ?? []);
          return;
        }
        if (superAdminTab === 'prescription-control') {
          const res = await api.superAdmin.prescriptions({ limit: 200 });
          if (!cancelled) setSuperAdminPrescriptions(res.prescriptions ?? []);
        }
      } catch {
        if (!cancelled) showToast('Failed to load super admin management data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNav, userRole, superAdminTab, superAdminDoctorSearch, superAdminPatientSearch]);

  const savePatients = (data: Patient[]) => {
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(data));
    setPatients(data);
  };

  const savePrescriptions = (data: Prescription[]) => {
    localStorage.setItem(STORAGE_KEYS.prescriptions, JSON.stringify(data));
    setPrescriptions(data);
  };

  const saveAppointments = (data: Appointment[]) => {
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(data));
    setAppointments(data);
  };

  const saveInvoices = (data: Invoice[]) => {
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(data));
    setInvoices(data);
  };

  const saveLabOrders = (data: LabOrder[]) => {
    localStorage.setItem(STORAGE_KEYS.labOrders, JSON.stringify(data));
    setLabOrders(data);
  };

  const loadPatientMedicalHistory = (patientId: string) => {
    try {
      const raw = localStorage.getItem(MEDICAL_HISTORY_KEY(patientId));
      setMedicalHistory(raw ? JSON.parse(raw) : {});
    } catch { setMedicalHistory({}); }
  };

  const saveMedicalHistory = (patientId: string, data: MedicalHistory) => {
    localStorage.setItem(MEDICAL_HISTORY_KEY(patientId), JSON.stringify(data));
    setMedicalHistory(data);
  };

  const loadTreatmentPlans = (patientId: string) => {
    try {
      const raw = localStorage.getItem(TREATMENT_PLANS_KEY(patientId));
      setTreatmentPlans(raw ? JSON.parse(raw) : []);
    } catch { setTreatmentPlans([]); }
  };

  const saveTreatmentPlans = (patientId: string, plans: TreatmentPlan[]) => {
    localStorage.setItem(TREATMENT_PLANS_KEY(patientId), JSON.stringify(plans));
    setTreatmentPlans(plans);
  };

  const loadTreatmentRecords = (patientId: string) => {
    try {
      const raw = localStorage.getItem(TREATMENT_RECORDS_KEY(patientId));
      setTreatmentRecords(raw ? JSON.parse(raw) : []);
    } catch { setTreatmentRecords([]); }
  };

  const saveTreatmentRecords = (patientId: string, records: TreatmentRecord[]) => {
    localStorage.setItem(TREATMENT_RECORDS_KEY(patientId), JSON.stringify(records));
    setTreatmentRecords(records);
  };

  const loadConsent = (patientId: string) => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY(patientId));
      setConsent(raw ? JSON.parse(raw) : null);
    } catch { setConsent(null); }
  };

  const loadPatientRecordForm = (patient: Patient) => {
    const defaults = getDefaultPatientRecordFormData();
    try {
      const raw = localStorage.getItem(PATIENT_RECORD_FORM_KEY(patient.id));
      if (raw) {
        const parsed = JSON.parse(raw) as PatientRecordFormData;
        // Merge into fresh defaults — never spread previous patient's form state.
        setPatientRecordForm({
          ...defaults,
          ...parsed,
          treatmentChecklist: {
            ...defaults.treatmentChecklist,
            ...(parsed.treatmentChecklist ?? {}),
          },
          regNo: parsed.regNo ?? patient.regNo ?? '',
          name: parsed.name ?? patient.name ?? '',
          occupation: parsed.occupation ?? patient.occupation ?? '',
          mobile: parsed.mobile ?? patient.phone ?? '',
          address: parsed.address ?? patient.address ?? '',
          refBy: parsed.refBy ?? patient.refBy ?? '',
          age: parsed.age ?? patient.age ?? '',
        });
        return;
      }
    } catch {
      // ignore
    }

    // Default from patient profile (no saved draft for this patient)
    setPatientRecordForm({
      ...defaults,
      regNo: patient.regNo ?? '',
      name: patient.name ?? '',
      occupation: patient.occupation ?? '',
      mobile: patient.phone ?? '',
      address: patient.address ?? '',
      refBy: patient.refBy ?? '',
      age: patient.age ?? '',
      diagnosisText: '',
    });
  };

  const savePatientRecordForm = (patientId: string, data: PatientRecordFormData) => {
    localStorage.setItem(PATIENT_RECORD_FORM_KEY(patientId), JSON.stringify(data));
    setPatientRecordForm(data);
  };

  const saveConsent = (patientId: string, data: PatientConsent) => {
    localStorage.setItem(CONSENT_KEY(patientId), JSON.stringify(data));
    setConsent(data);
  };

  const calculateTotals = () => {
    const totalCost = treatmentRecords.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    const totalPaid = treatmentRecords.reduce((sum, r) => sum + (parseFloat(r.paid) || 0), 0);
    return { totalCost, totalPaid, totalDue: totalCost - totalPaid };
  };

  const showToast = (message: string) => {
    setShowNotice(message);
    setTimeout(() => setShowNotice(null), 3000);
  };

  const handleSmsTemplate = (
    kind: 'appointment' | 'prescription' | 'lab' | 'payment' | 'birthday' | 'custom',
  ) => {
    if (kind === 'custom') {
      showToast('Type your message below, then Send.');
      return;
    }
    if (!smsComposePatientId) {
      showToast('Select a patient first');
      return;
    }
    const p = patients.find((x) => x.id === smsComposePatientId);
    if (!p) {
      showToast('Select a patient first');
      return;
    }
    const clinic = dashboardHeaderDraft.clinicName || 'our clinic';
    const phoneLine = dashboardHeaderDraft.phone ? ` Tel: ${dashboardHeaderDraft.phone}` : '';
    const body: Record<string, string> = {
      appointment: `Hello ${p.name}, this is ${clinic}.${phoneLine} Reminder: please attend your scheduled dental appointment. Reply if you need to reschedule.`,
      prescription: `Hello ${p.name}, your prescription is ready at ${clinic}.${phoneLine}`,
      lab: `Hello ${p.name}, lab work update from ${clinic}.${phoneLine} Please contact us for details.`,
      payment: `Hello ${p.name}, friendly reminder from ${clinic}: there may be a balance due on your account.${phoneLine}`,
      birthday: `Happy birthday ${p.name}! Best wishes from ${clinic}.${phoneLine}`,
    };
    setSmsComposeMessage(body[kind] ?? '');
    showToast('Template applied — review and send');
  };

  const handleSendSmsCompose = async () => {
    if (!api.getToken()) {
      showToast('Log in to send SMS');
      return;
    }
    const p = patients.find((x) => x.id === smsComposePatientId);
    if (!p?.phone?.trim()) {
      showToast('Select a patient with a phone number');
      return;
    }
    const msg = smsComposeMessage.trim();
    if (!msg) {
      showToast('Enter a message');
      return;
    }
    setSmsSending(true);
    try {
      await api.communication.sendSMS(p.phone.trim(), msg, 'dashboard_compose');
      showToast('SMS sent');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (activeNav === 'patients' && patientsSearchOverride !== null && searchQuery.trim()) {
      return patientsSearchOverride;
    }
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.regNo?.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [patients, searchQuery, patientsSearchOverride, activeNav]);

  useEffect(() => {
    if (activeNav !== 'patients') {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    if (!api.getToken()) {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    setPatientSearchLoading(true);
    const t = window.setTimeout(() => {
      api.patients
        .list({ search: q, limit: 200 })
        .then((res) => {
          const list = (res as { patients: any[] }).patients ?? [];
          setPatientsSearchOverride(list.map(mapPatientFromApi));
        })
        .catch(() => setPatientsSearchOverride(null))
        .finally(() => setPatientSearchLoading(false));
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchQuery, activeNav]);

  useEffect(() => {
    const t = window.setTimeout(() => setClinicAdminSearch(clinicAdminSearchInput), 400);
    return () => window.clearTimeout(t);
  }, [clinicAdminSearchInput]);

  useEffect(() => {
    setClinicAdminPage(1);
  }, [clinicAdminSearch, adminFilterClinicId]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN' && adminClinicOptions.length > 0) {
      setNewStaffForm((f) => (f.clinicId ? f : { ...f, clinicId: adminClinicOptions[0].id }));
    }
  }, [userRole, adminClinicOptions]);

  useEffect(() => {
    if (activeNav !== 'clinic-admin' || !api.getToken()) return;
    if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') return;
    let cancelled = false;
    setClinicAdminLoading(true);
    (async () => {
      try {
        if (userRole === 'SUPER_ADMIN') {
          const cres = await api.admin.clinics();
          if (!cancelled) setAdminClinicOptions(cres.clinics ?? []);
        } else if (!cancelled) {
          setAdminClinicOptions([]);
        }
        const res = await api.admin.users({
          search: clinicAdminSearch.trim() || undefined,
          page: clinicAdminPage,
          limit: 25,
          clinicId: userRole === 'SUPER_ADMIN' && adminFilterClinicId ? adminFilterClinicId : undefined,
        });
        if (cancelled) return;
        setClinicAdminUsers(res.users ?? []);
        setClinicAdminTotal(res.total ?? 0);
      } catch {
        if (!cancelled) showToast('Failed to load team');
      } finally {
        if (!cancelled) setClinicAdminLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNav, userRole, clinicAdminSearch, clinicAdminPage, adminFilterClinicId]);

  const filteredAppointments = useMemo(() => {
    const todayYmd = formatLocalYMD(new Date());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndYmd = formatLocalYMD(weekEnd);
    const notCancelled = (a: Appointment) => {
      const s = String(a.status).toUpperCase();
      return s !== 'CANCELLED' && s !== 'CANCELED';
    };
    let list = appointments.filter(notCancelled);
    if (appointmentScheduleFilter === 'today') list = list.filter((a) => a.date === todayYmd);
    else if (appointmentScheduleFilter === 'upcoming') list = list.filter((a) => a.date >= todayYmd);
    else if (appointmentScheduleFilter === 'week') {
      list = list.filter((a) => a.date >= todayYmd && a.date <= weekEndYmd);
    }
    return [...list].sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      return c !== 0 ? c : (a.time || '').localeCompare(b.time || '');
    });
  }, [appointments, appointmentScheduleFilter]);

  const filteredInvoicesForBilling = useMemo(() => {
    return invoices.filter((inv) => {
      if (billingInvoiceFilter === 'paid') return inv.status === 'PAID';
      if (billingInvoiceFilter === 'open') return inv.status !== 'PAID';
      if (billingInvoiceFilter === 'overdue') return invoiceIsOverdue(inv);
      return true;
    });
  }, [invoices, billingInvoiceFilter]);

  const patientsSortedForList = useMemo(() => {
    const list = [...filteredPatients];
    const mul = patientSortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (patientSortKey) {
        case 'name':
          return mul * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'regNo':
          return mul * (a.regNo || '').localeCompare(b.regNo || '', undefined, { numeric: true });
        case 'phone':
          return mul * a.phone.localeCompare(b.phone);
        case 'createdAt':
          return mul * (a.createdAt - b.createdAt);
        default:
          return 0;
      }
    });
    return list;
  }, [filteredPatients, patientSortKey, patientSortDir]);

  const patientListTotalPages = Math.max(1, Math.ceil(patientsSortedForList.length / patientListPageSize));

  const patientsPageSlice = useMemo(() => {
    const start = (patientListPage - 1) * patientListPageSize;
    return patientsSortedForList.slice(start, start + patientListPageSize);
  }, [patientsSortedForList, patientListPage, patientListPageSize]);

  const filteredDrugs = useMemo(() => {
    if (!drugSearch) return DRUG_DATABASE;
    const q = drugSearch.toLowerCase();
    return DRUG_DATABASE.filter(d => 
      d.brand.toLowerCase().includes(q) || 
      d.generic.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q)
    );
  }, [drugSearch]);

  const todayAppointments = useMemo(() => {
    const today = formatLocalYMD(new Date());
    return appointments.filter((a) => a.date === today);
  }, [appointments]);

  const stats = useMemo(() => {
    if (dashboardApiStats) {
      return {
        totalPatients: dashboardApiStats.totalPatients,
        todayAppointments: dashboardApiStats.todayAppointments,
        totalPrescriptions: dashboardApiStats.prescriptionsThisMonth,
        prescriptionStatLabel: 'Prescriptions (this month)',
        pendingInvoices: dashboardApiStats.pendingInvoicesCount,
        overdueInvoices: dashboardApiStats.overdueInvoicesCount ?? invoices.filter(invoiceIsOverdue).length,
        pendingLab: dashboardApiStats.pendingLabOrders,
        monthlyRevenue: dashboardApiStats.monthlyRevenue,
        revenueStatLabel: 'Collected (this month)',
        pendingDue: dashboardApiStats.pendingDue,
        upcomingAppointments: dashboardApiStats.upcomingAppointments,
        newPatientsThisMonth: dashboardApiStats.newPatientsThisMonth,
      };
    }
    return {
      totalPatients: patients.length,
      todayAppointments: todayAppointments.length,
      totalPrescriptions: prescriptions.length,
      prescriptionStatLabel: 'Prescriptions',
      pendingInvoices: invoices.filter((i) => i.status !== 'PAID').length,
      overdueInvoices: invoices.filter(invoiceIsOverdue).length,
      pendingLab: labOrders.filter((l) => l.status !== 'DELIVERED').length,
      monthlyRevenue: invoices.reduce((sum, i) => sum + i.paid, 0),
      revenueStatLabel: 'Total collected (loaded)',
      pendingDue: invoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + i.due, 0),
      upcomingAppointments: appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
      newPatientsThisMonth: 0,
    };
  }, [dashboardApiStats, patients, todayAppointments, prescriptions, invoices, labOrders, appointments]);

  useEffect(() => {
    setPatientListPage(1);
  }, [searchQuery, patientSortKey, patientSortDir]);

  useEffect(() => {
    if (patientListPage > patientListTotalPages) {
      setPatientListPage(patientListTotalPages);
    }
  }, [patientListPage, patientListTotalPages]);

  // Handlers
  const handleAddPatient = async () => {
    if (!patientForm.name || !patientForm.phone) {
      showToast('Name and phone are required');
      return;
    }
    if (api.getToken()) {
      try {
        await api.patients.create({
          name: patientForm.name,
          phone: patientForm.phone,
          age: patientForm.age ? parseInt(patientForm.age, 10) : undefined,
          gender: patientForm.gender || undefined,
          email: patientForm.email || undefined,
          address: patientForm.address || undefined,
          bloodGroup: patientForm.bloodGroup || undefined,
          occupation: patientForm.occupation || undefined,
          referredBy: patientForm.refBy || undefined,
        });
        setPatientForm({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '', occupation: '', refBy: '' });
        showToast('Patient added successfully');
        loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to add patient');
      }
      return;
    }
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      regNo: `P${String(patients.length + 1).padStart(5, '0')}`,
      name: patientForm.name,
      phone: patientForm.phone,
      age: patientForm.age,
      gender: patientForm.gender,
      email: patientForm.email,
      address: patientForm.address,
      bloodGroup: patientForm.bloodGroup,
      occupation: patientForm.occupation,
      refBy: patientForm.refBy,
      createdAt: Date.now(),
    };
    savePatients([newPatient, ...patients]);
    setPatientForm({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '', occupation: '', refBy: '' });
    showToast('Patient added successfully');
  };

  const togglePatientSort = (key: PatientSortKey) => {
    setPatientSortKey((prevKey) => {
      if (prevKey === key) {
        setPatientSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setPatientSortDir('asc');
      return key;
    });
  };

  const exportPatientsListCsv = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      ['Reg No', 'Name', 'Phone', 'Age', 'Gender', 'Created (ISO)'].join(','),
      ...patientsSortedForList.map((p) =>
        [
          esc(p.regNo || ''),
          esc(p.name),
          esc(p.phone),
          esc(p.age || ''),
          esc(p.gender || ''),
          esc(new Date(p.createdAt).toISOString()),
        ].join(','),
      ),
    ];
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  };

  const exportInvoicesCsv = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const list = filteredInvoicesForBilling;
    const lines = [
      ['Invoice No', 'Patient', 'Date', 'Due date', 'Total', 'Paid', 'Due', 'Status'].join(','),
      ...list.map((inv) =>
        [
          esc(inv.invoiceNo),
          esc(inv.patientName),
          esc(inv.date),
          esc(inv.dueDate || ''),
          String(inv.total),
          String(inv.paid),
          String(inv.due),
          esc(inv.status),
        ].join(','),
      ),
    ];
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${formatLocalYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Invoices exported');
  };

  const exportAppointmentsCsv = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      ['Date', 'Time', 'Patient', 'Phone', 'Type', 'Status', 'Duration (min)'].join(','),
      ...filteredAppointments.map((a) =>
        [
          esc(a.date),
          esc(a.time),
          esc(a.patientName),
          esc(a.patientPhone || ''),
          esc(a.type),
          esc(a.status),
          String(a.duration ?? 30),
        ].join(','),
      ),
    ];
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${formatLocalYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Appointments exported');
  };

  const handleSendAppointmentReminder = async (appointmentId: string) => {
    if (api.getToken()) {
      try {
        await api.communication.sendAppointmentReminder(appointmentId);
        showToast('Appointment reminder sent');
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to send reminder');
      }
      return;
    }

    showToast('Login to send appointment reminders');
  };

  const setLocalAppointmentStatus = (appointmentId: string, status: string) => {
    const next = appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a));
    saveAppointments(next);
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    if (!api.getToken()) {
      setLocalAppointmentStatus(appointmentId, 'CONFIRMED');
      showToast('Appointment confirmed');
      return;
    }
    try {
      await api.appointments.confirm(appointmentId);
      showToast('Appointment confirmed');
      await loadData();
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to confirm appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!api.getToken()) {
      setLocalAppointmentStatus(appointmentId, 'CANCELLED');
      showToast('Appointment cancelled');
      return;
    }
    try {
      await api.appointments.cancel(appointmentId);
      showToast('Appointment cancelled');
      await loadData();
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to cancel appointment');
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!api.getToken()) {
      setLocalAppointmentStatus(appointmentId, 'COMPLETED');
      showToast('Appointment completed');
      return;
    }
    try {
      await api.appointments.complete(appointmentId);
      showToast('Appointment completed');
      await loadData();
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to complete appointment');
    }
  };

  const handleDeletePatient = async (p: Patient) => {
    if (!window.confirm(`Delete patient "${p.name}" (${p.regNo || p.phone})? This cannot be undone.`)) return;
    if (api.getToken()) {
      try {
        await api.patients.delete(p.id);
        if (selectedPatient?.id === p.id) {
          setSelectedPatient(null);
          setActiveNav('patients');
        }
        showToast('Patient deleted');
        await loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to delete patient');
      }
      return;
    }
    const next = patients.filter((x) => x.id !== p.id);
    savePatients(next);
    clearPatientLocalStorage(p.id);
    if (selectedPatient?.id === p.id) {
      setSelectedPatient(null);
      setActiveNav('patients');
    }
    showToast('Patient deleted');
  };

  const handleAddAppointment = async () => {
    if (!appointmentForm.patientId || !appointmentForm.date || !appointmentForm.time) {
      showToast('Please fill all appointment details');
      return;
    }
    if (api.getToken()) {
      try {
        await api.appointments.create({
          patientId: appointmentForm.patientId,
          date: new Date(`${appointmentForm.date}T${appointmentForm.time}`).toISOString(),
          time: appointmentForm.time,
          duration: 30,
          type: appointmentForm.type,
        });
        setAppointmentForm({ patientId: '', date: '', time: '', type: 'Checkup' });
        showToast('Appointment scheduled');
        loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to schedule appointment');
      }
      return;
    }
    const patient = patients.find(p => p.id === appointmentForm.patientId);
    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      patientId: appointmentForm.patientId,
      patientName: patient?.name || 'Unknown',
      date: appointmentForm.date,
      time: appointmentForm.time,
      type: appointmentForm.type,
      status: 'SCHEDULED',
      duration: 30,
    };
    saveAppointments([newAppointment, ...appointments]);
    setAppointmentForm({ patientId: '', date: '', time: '', type: 'Checkup' });
    showToast('Appointment scheduled');
  };

  const handleAddDrug = () => {
    if (!drugForm.brand || !drugForm.dose) {
      showToast('Drug name and dose are required');
      return;
    }
    const newDrug: DrugItem = {
      id: crypto.randomUUID(),
      brand: drugForm.brand,
      dose: drugForm.dose,
      duration: drugForm.duration,
      frequency: drugForm.frequency,
      beforeFood: drugForm.beforeFood,
      afterFood: drugForm.afterFood,
    };
    setPrescriptionForm({ ...prescriptionForm, drugs: [...prescriptionForm.drugs, newDrug] });
    setDrugForm({ brand: '', dose: '', duration: '', frequency: '1-0-1', beforeFood: false, afterFood: true });
    setDrugSearch('');
  };

  const handleSavePrescription = async () => {
    if (!prescriptionForm.patientId || prescriptionForm.drugs.length === 0) {
      showToast('Select patient and add at least one drug');
      return;
    }
    if (api.getToken()) {
      try {
        await api.prescriptions.create({
          patientId: prescriptionForm.patientId,
          diagnosis: prescriptionForm.diagnosis,
          advice: prescriptionForm.advice,
          items: prescriptionForm.drugs.map((d) => ({
            drugName: d.brand,
            dosage: d.dose,
            frequency: d.frequency,
            duration: d.duration,
            beforeFood: d.beforeFood,
            afterFood: d.afterFood,
          })),
        });
        setPrescriptionForm({ patientId: '', diagnosis: '', advice: '', drugs: [] });
        showToast('Prescription saved');
        loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to save prescription');
      }
      return;
    }
    const patient = patients.find(p => p.id === prescriptionForm.patientId);
    const newPrescription: Prescription = {
      id: crypto.randomUUID(),
      patientId: prescriptionForm.patientId,
      patientName: patient?.name || 'Unknown',
      date: new Date().toISOString().split('T')[0],
      diagnosis: prescriptionForm.diagnosis,
      drugs: prescriptionForm.drugs,
    };
    savePrescriptions([newPrescription, ...prescriptions]);
    setPrescriptionForm({ patientId: '', diagnosis: '', advice: '', drugs: [] });
    showToast('Prescription saved');
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.patientId || invoiceForm.items.length === 0) {
      showToast('Select patient and add items');
      return;
    }
    if (api.getToken()) {
      try {
        await api.invoices.create({
          patientId: invoiceForm.patientId,
          discount: invoiceForm.discount,
          dueDate: invoiceForm.dueDate ? invoiceForm.dueDate : undefined,
          items: invoiceForm.items.map((item) => ({
            description: item.description,
            quantity: 1,
            unitPrice: item.amount,
          })),
        });
        setInvoiceForm({ patientId: '', items: [], discount: 0, dueDate: '' });
        showToast('Invoice created');
        loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to create invoice');
      }
      return;
    }
    const patient = patients.find(p => p.id === invoiceForm.patientId);
    const total = invoiceForm.items.reduce((sum, item) => sum + item.amount, 0) - invoiceForm.discount;
    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNo: `INV${new Date().getFullYear()}${String(invoices.length + 1).padStart(4, '0')}`,
      patientName: patient?.name || 'Unknown',
      total,
      paid: 0,
      due: total,
      date: formatLocalYMD(new Date()),
      dueDate: invoiceForm.dueDate || undefined,
      status: 'PENDING',
    };
    saveInvoices([newInvoice, ...invoices]);
    setInvoiceForm({ patientId: '', items: [], discount: 0, dueDate: '' });
    showToast('Invoice created');
  };

const handlePrintInvoice = (invoice: Invoice) => {
    const invoiceHtml = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice - ${invoice.invoiceNo}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif; padding: 24px 32px; color: #111827; background: #fff; }
          .shell { max-width: 820px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 28px 32px; border-radius: 12px; }
          .title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 0.6px; margin: 0 0 6px; }
          .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin: 0 0 18px; }
          .top { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; }
          .brand h2 { margin: 0 0 2px; font-size: 18px; }
          .brand p { margin: 0; font-size: 13px; color: #6b7280; }
          .billto { margin-top: 12px; font-size: 13px; color: #374151; }
          .meta { font-size: 13px; color: #374151; text-align: right; }
          .meta div { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 6px; }
          th { text-align: left; color: #374151; font-weight: 700; }
          td.amount, th.amount { text-align: right; }
          .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
          .totals-card { min-width: 260px; font-size: 13px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #374151; }
          .row strong { color: #111827; }
          .grand { border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px; font-size: 14px; }
          @media print { body { padding: 0; } .shell { border: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="shell">
          <h1 class="title">Invoice</h1>
          <p class="subtitle">BaigDentPro Clinic</p>

          <div class="top">
            <div class="brand">
              <h2>BaigDentPro Clinic</h2>
              <p>Dental practice billing invoice</p>
              <div class="billto"><strong>Patient:</strong> ${invoice.patientName}</div>
            </div>
            <div class="meta">
              <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
              <div><strong>Date:</strong> ${invoice.date}</div>
              <div><strong>Status:</strong> ${invoice.status}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dental treatment & procedures</td>
                <td class="amount">${invoice.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-card">
              <div class="row"><span>Total</span><strong>৳ ${invoice.total.toFixed(2)}</strong></div>
              <div class="row"><span>Paid</span><strong>৳ ${invoice.paid.toFixed(2)}</strong></div>
              <div class="row grand"><span>Due</span><strong>৳ ${invoice.due.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </body>
      </html>`;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    if (!printWindow) {
      showToast('Popup blocked. Allow popups to print.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // ignore printing errors
      }
      setTimeout(() => {
        try {
          printWindow.close();
        } catch {
          // ignore close errors
        }
      }, 500);
    }, 450);
  };

  const handlePrintMushok63 = (invoice: Invoice) => {
const printHtml = (title: string, html: string) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;left:0;top:0;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    doc.title = title;
    const printFn = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    };
    iframe.onload = () => setTimeout(printFn, 400);
  };

    const mushokHtml = `<!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>মূশক-৬.৩ - ${invoice.invoiceNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, system-ui, 'Noto Sans Bengali', 'Segoe UI', sans-serif; padding: 24px 32px; color: #111827; background: #fff; }
          .shell { max-width: 800px; margin: 0 auto; border: 1px solid #111827; padding: 24px 32px; }
          .gov-header { text-align: center; margin-bottom: 8px; }
          .gov-header h1 { font-size: 16px; margin: 0; }
          .gov-header h2 { font-size: 14px; margin: 4px 0 0; }
          .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 8px 0 16px; }
          .box { border: 1px solid #111827; padding: 4px 12px; font-size: 13px; font-weight: 600; }
          .main-title { text-align: center; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
          .section { font-size: 13px; margin-bottom: 10px; }
          .section strong { display: inline-block; min-width: 130px; }
          .flex-row { display: flex; justify-content: space-between; gap: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 6px 4px; text-align: center; }
          th { font-weight: 600; }
          .right { text-align: right; padding-right: 8px; }
          .total-row td { font-weight: 600; }
          .sign-section { margin-top: 28px; font-size: 12px; }
          .footnote { margin-top: 16px; font-size: 11px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="gov-header">
            <h1>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h1>
            <h2>জাতীয় রাজস্ব বোর্ড</h2>
          </div>

          <div class="title-row">
            <div class="main-title">
              কর চালানপত্র<br />
              [ ভ্যাট ও সম্পূরক শুল্ক আইন, ২০১২ (ধারা ৪০) এর উপধারা (১) এর দফা (গ) ও দফা (ঘ) ]
            </div>
            <div class="box">মূশক-৬.৩</div>
          </div>

          <div class="section">
            <strong>নিবন্ধিত ব্যক্তির নাম:</strong> BaigDentPro Clinic<br />
            <strong>নিবন্ধিত ব্যক্তির বিআইএন:</strong> _________________________<br />
            <strong>চালানপত্র ইস্যুকারীর ঠিকানা:</strong> _________________________
          </div>

          <div class="flex-row section">
            <div>
              <strong>ক্রেতার নাম:</strong> ${invoice.patientName}<br />
              <strong>সরবরাহের গন্তব্যস্থল:</strong> _________________________
            </div>
            <div>
              <strong>চালানপত্র নম্বর:</strong> ${invoice.invoiceNo}<br />
              <strong>ইস্যুর তারিখ:</strong> ${invoice.date}<br />
              <strong>ইস্যুর সময়:</strong> __________
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>পণ্য বা সেবার বর্ণনা<br />(প্রয়োজনে ব্র্যান্ড নামসহ)</th>
                <th>সরবরাহের একক</th>
                <th>পরিমাণ</th>
                <th>একক মূল্য<br />(টাকায়)</th>
                <th>মোট মূল্য<br />(টাকায়)</th>
                <th>মূল্য সংযোজন করের হার / সুনির্দিষ্ট কর</th>
                <th>মূল্য সংযোজন কর / সুনির্দিষ্ট করের পরিমাণ<br />(টাকায়)</th>
                <th>সকল প্রকার শুল্ক ও করসহ মূল্য<br />(টাকায়)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>১</td>
                <td>ডেন্টাল চিকিৎসা সেবা</td>
                <td>সেবা</td>
                <td>১</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td>১৫%</td>
                <td class="right">${(invoice.total * 0.15).toFixed(2)}</td>
                <td class="right">${(invoice.total * 1.15).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="5" class="right">সর্বমোট</td>
                <td class="right">${invoice.total.toFixed(2)}</td>
                <td></td>
                <td class="right">${(invoice.total * 0.15).toFixed(2)}</td>
                <td class="right">${(invoice.total * 1.15).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="sign-section">
            <div>প্রতিষ্ঠান কর্তৃপক্ষের দায়িত্বপ্রাপ্ত ব্যক্তির নাম: __________________________</div>
            <div>পদবী: __________________________</div>
            <div>স্বাক্ষর: __________________________</div>
            <div>সীল: __________________________</div>
          </div>

          <div class="footnote">
            * উপরোক্ত তথ্যাবলী সরবরাহের ক্ষেত্রে ফরমটি সম্মিলিত কর চালানপত্র ও উৎসে কর কর্তন সনদপত্র হিসেবে বিবেচিত হইবে এবং উক্ত উৎস কর কর্তনকারীর সরবরাহের ক্ষেত্রে প্রযোজ্য হবে।
          </div>
        </div>
      </body>
      </html>`;

    printHtml(`মূশক-৬.৩ - ${invoice.invoiceNo}`, mushokHtml);
  };

  const handleCreateLabOrder = async () => {
    if (!labForm.patientId || !labForm.workType) {
      showToast('Select patient and work type');
      return;
    }
    if (api.getToken()) {
      try {
        await api.lab.create({
          patientId: labForm.patientId,
          workType: labForm.workType,
          description: labForm.description || labForm.workType,
          toothNumber: labForm.toothNumber || undefined,
          shade: labForm.shade || undefined,
        });
        setLabForm({ patientId: '', workType: 'Crown', description: '', toothNumber: '', shade: '' });
        showToast('Lab order created');
        loadData();
      } catch (e: any) {
        showToast(e?.message ?? 'Failed to create lab order');
      }
      return;
    }
    const patient = patients.find(p => p.id === labForm.patientId);
    const newOrder: LabOrder = {
      id: crypto.randomUUID(),
      patientName: patient?.name || 'Unknown',
      workType: labForm.workType,
      status: 'PENDING',
      orderDate: new Date().toISOString().split('T')[0],
    };
    saveLabOrders([newOrder, ...labOrders]);
    setLabForm({ patientId: '', workType: 'Crown', description: '', toothNumber: '', shade: '' });
    showToast('Lab order created');
  };

  const loadDentalChart = (patientId: string) => {
    try {
      const raw = localStorage.getItem(DENTAL_CHART_KEY(patientId));
      setSelectedTeeth(raw ? JSON.parse(raw) : []);
    } catch {
      setSelectedTeeth([]);
    }
  };

  const saveDentalChart = (patientId: string, teeth: number[]) => {
    localStorage.setItem(DENTAL_CHART_KEY(patientId), JSON.stringify(teeth));
    setSelectedTeeth(teeth);
  };

  const selectPatientForView = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientProfileTab('info');
    setChiefComplaint('');
    setClinicalFindings('');
    setInvestigation('');
    setDiagnosis('');
    loadPatientMedicalHistory(patient.id);
    loadTreatmentPlans(patient.id);
    loadTreatmentRecords(patient.id);
    loadConsent(patient.id);
    loadDentalChart(patient.id);
    loadPatientRecordForm(patient);
    setActiveNav('patient-detail');
  };

  const startNewPrescriptionForPatient = (patient: Patient | null) => {
    setPrescriptionForm({
      patientId: patient ? patient.id : '',
      diagnosis: '',
      advice: '',
      drugs: [],
    });
    setSelectedPatient(patient);
    setActiveNav('prescription');
  };

  const selectPatientForPrescription = (patient: Patient) => {
    startNewPrescriptionForPatient(patient);
  };

  const toggleTooth = (num: number) => {
    setSelectedTeeth(prev => {
      const next = prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num];
      if (selectedPatient) {
        try {
          localStorage.setItem(DENTAL_CHART_KEY(selectedPatient.id), JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  // Render functions
  const renderSidebar = () => (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="BaigDentPro" className="sidebar-logo-img" />
          <span>BaigDentPro</span>
        </div>
        <div className="sidebar-user">
          <i className="fa-solid fa-user-circle"></i>
          <span>Dr. {userName}</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <button className={`sidebar-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>
          <i className="fa-solid fa-grid-2"></i> <span>Dashboard</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'patients' ? 'active' : ''}`} onClick={() => setActiveNav('patients')}>
          <i className="fa-solid fa-user-group"></i> <span>Patients</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'prescription' ? 'active' : ''}`} onClick={() => setActiveNav('prescription')}>
          <i className="fa-solid fa-prescription"></i> <span>New Prescription</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'prescriptions-list' ? 'active' : ''}`} onClick={() => setActiveNav('prescriptions-list')}>
          <i className="fa-solid fa-file-waveform"></i> <span>All Prescriptions</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'appointments' ? 'active' : ''}`} onClick={() => setActiveNav('appointments')}>
          <i className="fa-solid fa-calendar-check"></i> <span>Appointments</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'billing' ? 'active' : ''}`} onClick={() => setActiveNav('billing')}>
          <i className="fa-solid fa-credit-card"></i> <span>Billing</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'lab' ? 'active' : ''}`} onClick={() => setActiveNav('lab')}>
          <i className="fa-solid fa-flask-vial"></i> <span>Lab Orders</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'drugs' ? 'active' : ''}`} onClick={() => setActiveNav('drugs')}>
          <i className="fa-solid fa-capsules"></i> <span>Drug Database</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'sms' ? 'active' : ''}`} onClick={() => setActiveNav('sms')}>
          <i className="fa-solid fa-message"></i> <span>SMS & Messages</span>
        </button>
        <button className={`sidebar-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}>
          <i className="fa-solid fa-gear"></i> <span>Settings</span>
        </button>
        {(userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') && (
          <button
            type="button"
            className={`sidebar-item ${activeNav === 'clinic-admin' ? 'active' : ''}`}
            onClick={() => setActiveNav('clinic-admin')}
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}
          >
            <i className="fa-solid fa-user-shield"></i> <span>Clinic admin</span>
          </button>
        )}
        {userRole === 'SUPER_ADMIN' && (
          <button className={`sidebar-item ${activeNav === 'super-admin' ? 'active' : ''}`} onClick={() => setActiveNav('super-admin')} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}>
            <i className="fa-solid fa-shield-halved"></i> <span>Super Admin</span>
          </button>
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  const renderDashboard = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-grid-2"></i> Dashboard</h1>
          <p>
            Welcome back, <span className="highlight">Dr. {userName}</span> — clinic overview for today
            {dashboardApiStats ? (
              <>
                {' '}
                · <strong>{stats.upcomingAppointments}</strong> upcoming appts ·{' '}
                <strong>{stats.newPatientsThisMonth}</strong> new patients this month
                {stats.overdueInvoices > 0 ? (
                  <>
                    {' '}
                    · <strong style={{ color: '#b45309' }}>{stats.overdueInvoices}</strong> overdue invoice
                    {stats.overdueInvoices === 1 ? '' : 's'}
                  </>
                ) : null}
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="header-actions">
          <span style={{ color: 'var(--neo-text-muted)', fontSize: '0.9rem' }}>
            <i className="fa-solid fa-clock" style={{ marginRight: 8, color: 'var(--neo-primary)' }}></i>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon"><i className="fa-solid fa-user-group"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalPatients}</span>
            <span className="stat-label">Total Patients</span>
          </div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-icon"><i className="fa-solid fa-calendar-check"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.todayAppointments}</span>
            <span className="stat-label">Today's Appointments</span>
          </div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-icon"><i className="fa-solid fa-file-waveform"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalPrescriptions}</span>
            <span className="stat-label">{stats.prescriptionStatLabel}</span>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-icon"><i className="fa-solid fa-receipt"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingInvoices}</span>
            <span className="stat-label">Open invoices</span>
            {stats.pendingDue > 0 && (
              <span className="stat-sublabel">৳{Math.round(stats.pendingDue).toLocaleString()} outstanding</span>
            )}
          </div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-icon"><i className="fa-solid fa-flask-vial"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingLab}</span>
            <span className="stat-label">Pending Lab Work</span>
          </div>
        </div>
        <div className="stat-card stat-revenue">
          <div className="stat-icon"><i className="fa-solid fa-sack-dollar"></i></div>
          <div className="stat-info">
            <span className="stat-value">৳{Math.round(stats.monthlyRevenue).toLocaleString()}</span>
            <span className="stat-label">{stats.revenueStatLabel}</span>
          </div>
        </div>
      </div>

      {dashboardApiStats && stats.pendingDue > 0 && (
        <div className="dashboard-ar-banner" role="status">
          <i className="fa-solid fa-circle-exclamation" aria-hidden />
          <span>
            Accounts receivable: <strong>৳{Math.round(stats.pendingDue).toLocaleString()}</strong> across open invoices
            {stats.overdueInvoices > 0 ? (
              <>
                {' '}
                (<strong>{stats.overdueInvoices}</strong> past due date)
              </>
            ) : null}
            {' — '}
            <button type="button" className="link-inline" onClick={() => { setBillingInvoiceFilter('overdue'); setActiveNav('billing'); }}>
              Review overdue
            </button>
            {' · '}
            <button type="button" className="link-inline" onClick={() => setActiveNav('billing')}>
              Billing
            </button>
            .
          </span>
        </div>
      )}

      {(dashboardRevenueChart.length > 0 || dashboardAppointmentChart.length > 0) && (
        <div className="dashboard-grid dashboard-charts-row">
          {dashboardRevenueChart.length > 0 && (
            <div className="dashboard-card dashboard-chart-card">
              <div className="card-header">
                <h3><i className="fa-solid fa-chart-column"></i> Collections (7 days)</h3>
              </div>
              <div className="card-body">
                <div className="dashboard-mini-chart" aria-label="Daily collections">
                  {(() => {
                    const maxR = Math.max(...dashboardRevenueChart.map((d) => d.revenue), 1);
                    return dashboardRevenueChart.map((d, i) => (
                      <div key={i} className="dashboard-mini-chart-col" title={`${d.date}: ৳${d.revenue}`}>
                        <div className="dashboard-mini-chart-plot">
                          <div
                            className="dashboard-mini-chart-bar dashboard-mini-chart-bar--revenue"
                            style={{ height: `${Math.max(8, (d.revenue / maxR) * 100)}%` }}
                          />
                        </div>
                        <span className="dashboard-mini-chart-label">{d.date}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
          {dashboardAppointmentChart.length > 0 && (
            <div className="dashboard-card dashboard-chart-card">
              <div className="card-header">
                <h3><i className="fa-solid fa-chart-simple"></i> Appointments (7 days)</h3>
              </div>
              <div className="card-body">
                <div className="dashboard-mini-chart" aria-label="Daily appointment count">
                  {(() => {
                    const maxC = Math.max(...dashboardAppointmentChart.map((d) => d.count), 1);
                    return dashboardAppointmentChart.map((d, i) => (
                      <div key={i} className="dashboard-mini-chart-col" title={`${d.date}: ${d.count} appts`}>
                        <div className="dashboard-mini-chart-plot">
                          <div
                            className="dashboard-mini-chart-bar dashboard-mini-chart-bar--appts"
                            style={{ height: `${Math.max(8, (d.count / maxC) * 100)}%` }}
                          />
                        </div>
                        <span className="dashboard-mini-chart-label">{d.date}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3><i className="fa-solid fa-calendar-day"></i> Today's Appointments</h3>
            <button className="btn-sm" onClick={() => setActiveNav('appointments')}>View All</button>
          </div>
          <div className="card-body">
            {todayAppointments.length === 0 ? (
              <div className="empty-state">
                <p style={{ position: 'relative', zIndex: 1 }}>No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="appointment-list">
                {todayAppointments.slice(0, 5).map(apt => (
                  <div key={apt.id} className="appointment-item">
                    <div className="apt-time">{apt.time}</div>
                    <div className="apt-info">
                      <strong>{apt.patientName}</strong>
                      <span>{apt.type}</span>
                    </div>
                    <span className={`apt-status status-${apt.status.toLowerCase()}`}>{apt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3><i className="fa-solid fa-user-plus"></i> Recent Patients</h3>
            <button className="btn-sm" onClick={() => setActiveNav('patients')}>View All</button>
          </div>
          <div className="card-body">
            {(dashboardRecentPatients ?? patients).length === 0 ? (
              <div className="empty-state">
                <p style={{ position: 'relative', zIndex: 1 }}>No patients registered yet</p>
              </div>
            ) : (
              <div className="patient-list-mini">
                {(dashboardRecentPatients ?? [...patients].sort((a, b) => b.createdAt - a.createdAt)).slice(0, 5).map(p => (
                  <div key={p.id} className="patient-item-mini" onClick={() => selectPatientForView(p)}>
                    <div className="patient-avatar">{p.name.charAt(0).toUpperCase()}</div>
                    <div className="patient-info-mini">
                      <strong>{p.name}</strong>
                      <span>{p.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3><i className="fa-solid fa-flask-vial"></i> Pending Lab Work</h3>
            <button className="btn-sm" onClick={() => setActiveNav('lab')}>View All</button>
          </div>
          <div className="card-body">
            {labOrders.filter(l => l.status !== 'DELIVERED').length === 0 ? (
              <div className="empty-state">
                <p style={{ position: 'relative', zIndex: 1 }}>No pending lab orders</p>
              </div>
            ) : (
              <div className="lab-list-mini">
                {labOrders.filter(l => l.status !== 'DELIVERED').slice(0, 5).map(l => (
                  <div key={l.id} className="lab-item-mini">
                    <span className="lab-type">{l.workType}</span>
                    <span style={{ color: 'var(--neo-text-secondary)' }}>{l.patientName}</span>
                    <span className={`lab-status status-${l.status.toLowerCase()}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3><i className="fa-solid fa-bolt-lightning"></i> Quick Actions</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => setActiveNav('patients')}>
            <i className="fa-solid fa-user-plus"></i>
            <span>Add Patient</span>
          </button>
          <button className="quick-action-btn" onClick={() => startNewPrescriptionForPatient(null)}>
            <i className="fa-solid fa-prescription"></i>
            <span>New Prescription</span>
          </button>
          <button className="quick-action-btn" onClick={() => setActiveNav('appointments')}>
            <i className="fa-solid fa-calendar-plus"></i>
            <span>Schedule Appointment</span>
          </button>
          <button className="quick-action-btn" onClick={() => setActiveNav('billing')}>
            <i className="fa-solid fa-credit-card"></i>
            <span>Create Invoice</span>
          </button>
          <button className="quick-action-btn" onClick={() => setActiveNav('lab')}>
            <i className="fa-solid fa-flask-vial"></i>
            <span>Lab Order</span>
          </button>
          <button className="quick-action-btn" onClick={() => setActiveNav('sms')}>
            <i className="fa-solid fa-paper-plane"></i>
            <span>Send SMS</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => {
    const listEmpty = patientsSortedForList.length === 0;
    const showLoading = dataLoading && patients.length === 0;
    const emptyMessage = showLoading
      ? 'Loading patients…'
      : patients.length === 0
        ? 'No patients registered yet'
        : searchQuery.trim()
          ? 'No patients match your search'
          : 'No patients found';

    const thSort = (key: PatientSortKey, label: string, align: 'left' | 'right' = 'left') => (
      <th
        style={{ textAlign: align, padding: '12px 14px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => togglePatientSort(key)}
        title="Sort"
      >
        {label}{' '}
        {patientSortKey === key ? (patientSortDir === 'asc' ? '▲' : '▼') : <span style={{ opacity: 0.35 }}>↕</span>}
      </th>
    );

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <h1><i className="fa-solid fa-users"></i> Patients</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="Search name / phone / email / reg no"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 280 }}
            />
            {api.getToken() && patientSearchLoading && searchQuery.trim() ? (
              <span className="patient-search-hint" style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>
                Searching…
              </span>
            ) : null}
            <button type="button" className="btn-secondary btn-sm" onClick={exportPatientsListCsv} disabled={patientsSortedForList.length === 0}>
              <i className="fa-solid fa-file-csv"></i> Export CSV
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
          <div className="dashboard-card">
            <div className="card-header">
              <h3><i className="fa-solid fa-user-plus"></i> Add Patient</h3>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <input className="input" placeholder="Patient name *" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} />
                <input className="input" placeholder="Phone *" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="input" placeholder="Age" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} />
                  <select className="input" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <input className="input" placeholder="Email" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} />
                <input className="input" placeholder="Address" value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="input" placeholder="Blood group" value={patientForm.bloodGroup} onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })} />
                  <input className="input" placeholder="Occupation" value={patientForm.occupation} onChange={(e) => setPatientForm({ ...patientForm, occupation: e.target.value })} />
                </div>
                <input className="input" placeholder="Referred by" value={patientForm.refBy} onChange={(e) => setPatientForm({ ...patientForm, refBy: e.target.value })} />
                <button className="btn-primary" onClick={handleAddPatient}>
                  <i className="fa-solid fa-plus"></i> Add Patient
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h3><i className="fa-solid fa-list"></i> Patient List</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginLeft: 'auto' }}>
                <label style={{ fontSize: 12, color: 'var(--neo-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Rows
                  <select
                    className="input"
                    style={{ width: 72, padding: '4px 8px', fontSize: 12 }}
                    value={patientListPageSize}
                    onChange={(e) => {
                      setPatientListPageSize(Number(e.target.value));
                      setPatientListPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <div style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>
                  Showing {listEmpty ? 0 : (patientListPage - 1) * patientListPageSize + 1}–
                  {listEmpty ? 0 : Math.min(patientListPage * patientListPageSize, patientsSortedForList.length)} of {patientsSortedForList.length}
                  {searchQuery.trim() ? ` (filtered from ${patients.length})` : ` (${patients.length} total)`}
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {listEmpty ? (
                <div className="empty-state" style={{ padding: 18 }}>
                  <p style={{ position: 'relative', zIndex: 1 }}>{emptyMessage}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {thSort('regNo', 'Reg No')}
                          {thSort('name', 'Name')}
                          {thSort('phone', 'Phone')}
                          <th style={{ textAlign: 'left', padding: '12px 14px' }}>Age</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px' }}>Gender</th>
                          {thSort('createdAt', 'Registered')}
                          <th style={{ textAlign: 'right', padding: '12px 14px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientsPageSlice.map((p) => (
                          <tr
                            key={p.id}
                            style={{ borderTop: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}
                            onClick={() => selectPatientForView(p)}
                          >
                            <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{p.regNo || '-'}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                              <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="link-phone" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                {p.phone}
                              </a>
                            </td>
                            <td style={{ padding: '10px 14px' }}>{p.age || '-'}</td>
                            <td style={{ padding: '10px 14px' }}>{p.gender || '-'}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--neo-text-muted)' }}>
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <button type="button" className="btn-sm" onClick={() => selectPatientForView(p)}>
                                <i className="fa-solid fa-eye"></i> View
                              </button>{' '}
                              <button type="button" className="btn-sm" onClick={() => selectPatientForPrescription(p)} style={{ marginLeft: 6 }}>
                                <i className="fa-solid fa-prescription"></i> Rx
                              </button>{' '}
                              <button
                                type="button"
                                className="btn-sm records-btn-danger"
                                style={{ marginLeft: 6 }}
                                onClick={() => handleDeletePatient(p)}
                                title="Delete patient"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {patientListTotalPages > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--neo-text-muted)' }}>
                        Page {patientListPage} of {patientListTotalPages}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={patientListPage <= 1}
                          onClick={() => setPatientListPage((n) => Math.max(1, n - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={patientListPage >= patientListTotalPages}
                          onClick={() => setPatientListPage((n) => Math.min(patientListTotalPages, n + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveTreatmentPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const plan: TreatmentPlan = {
      id: editingPlan?.id ?? crypto.randomUUID(),
      toothNumber: String(fd.get('toothNumber') ?? ''),
      diagnosis: String(fd.get('diagnosis') ?? ''),
      procedure: String(fd.get('procedure') ?? ''),
      cost: String(fd.get('cost') ?? '0'),
      cc: String(fd.get('cc') ?? ''),
      cf: String(fd.get('cf') ?? ''),
      investigation: String(fd.get('investigation') ?? ''),
      status: String(fd.get('status') ?? 'Not Start'),
    };
    const updatedPlans = editingPlan 
      ? treatmentPlans.map(p => p.id === plan.id ? plan : p) 
      : [...treatmentPlans, plan];
    saveTreatmentPlans(selectedPatient.id, updatedPlans);
    setShowTreatmentPlanModal(false);
    setEditingPlan(null);
    showToast('Treatment plan saved!');
  };

  const handleSaveMedicalHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);

    const data: MedicalHistory = {
      bloodPressure: fd.get('bloodPressure') === 'on',
      heartProblems: fd.get('heartProblems') === 'on',
      cardiacHtnMiPacemaker: fd.get('cardiacHtnMiPacemaker') === 'on',
      rheumaticFever: fd.get('rheumaticFever') === 'on',
      diabetes: fd.get('diabetes') === 'on',
      pepticUlcer: fd.get('pepticUlcer') === 'on',
      jaundice: fd.get('jaundice') === 'on',
      asthma: fd.get('asthma') === 'on',
      tuberculosis: fd.get('tuberculosis') === 'on',
      kidneyDiseases: fd.get('kidneyDiseases') === 'on',
      aids: fd.get('aids') === 'on',
      thyroid: fd.get('thyroid') === 'on',
      hepatitis: fd.get('hepatitis') === 'on',
      stroke: fd.get('stroke') === 'on',
      bleedingDisorder: fd.get('bleedingDisorder') === 'on',
      otherDiseases: String(fd.get('otherDiseases') ?? '').trim() || undefined,
      isPregnant: fd.get('isPregnant') === 'on',
      isLactating: fd.get('isLactating') === 'on',
      allergyPenicillin: fd.get('allergyPenicillin') === 'on',
      allergySulphur: fd.get('allergySulphur') === 'on',
      allergyAspirin: fd.get('allergyAspirin') === 'on',
      allergyLocalAnaesthesia: fd.get('allergyLocalAnaesthesia') === 'on',
      allergyOther: String(fd.get('allergyOther') ?? '').trim() || undefined,
      takingAspirinBloodThinner: fd.get('takingAspirinBloodThinner') === 'on',
      takingAntihypertensive: fd.get('takingAntihypertensive') === 'on',
      takingInhaler: fd.get('takingInhaler') === 'on',
      takingOther: String(fd.get('takingOther') ?? '').trim() || undefined,
      habitSmoking: fd.get('habitSmoking') === 'on',
      habitBetelLeaf: fd.get('habitBetelLeaf') === 'on',
      habitAlcohol: fd.get('habitAlcohol') === 'on',
      habitOther: String(fd.get('habitOther') ?? '').trim() || undefined,
      details: String(fd.get('details') ?? '').trim() || undefined,
    };

    saveMedicalHistory(selectedPatient.id, data);
    setShowMedicalHistoryModal(false);
    showToast('Medical history saved!');
  };

  const handleDeleteTreatmentPlan = (plan: TreatmentPlan) => {
    if (!selectedPatient) return;
    const updatedPlans = treatmentPlans.filter(p => p.id !== plan.id);
    saveTreatmentPlans(selectedPatient.id, updatedPlans);
    showToast('Treatment plan deleted!');
  };

  const handleSaveTreatmentRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const treatmentDone = String(fd.get('treatmentDone') ?? '').trim();
    if (!treatmentDone) {
      showToast('Treatment Done is required');
      return;
    }
    const record: TreatmentRecord = {
      id: editingRecord?.id ?? crypto.randomUUID(),
      date: String(fd.get('date') ?? new Date().toISOString().split('T')[0]),
      treatmentDone,
      cost: String(fd.get('cost') ?? '0'),
      paid: String(fd.get('paid') ?? '0'),
      // Due must always be derived from Cost - Paid to avoid inconsistent UI data.
      due: (() => {
        const costNum = parseFloat(String(fd.get('cost') ?? '0')) || 0;
        const paidNum = parseFloat(String(fd.get('paid') ?? '0')) || 0;
        const dueNum = Math.max(0, costNum - paidNum);
        return String(dueNum);
      })(),
      patientSignature: String(fd.get('patientSignature') ?? ''),
      doctorSignature: String(fd.get('doctorSignature') ?? ''),
    };
    const updatedRecords = editingRecord 
      ? treatmentRecords.map(r => r.id === record.id ? record : r) 
      : [...treatmentRecords, record];
    saveTreatmentRecords(selectedPatient.id, updatedRecords);
    setShowTreatmentRecordModal(false);
    setEditingRecord(null);
    showToast(editingRecord ? 'Record updated!' : 'Record added!');
  };

  const handleDeleteTreatmentRecord = (record: TreatmentRecord) => {
    if (!selectedPatient) return;
    const updatedRecords = treatmentRecords.filter(r => r.id !== record.id);
    saveTreatmentRecords(selectedPatient.id, updatedRecords);
    showToast('Record deleted!');
  };

  const handleSaveConsent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const consentType = String(fd.get('consentType') ?? 'treatment');
    const consentTexts: Record<string, string> = {
      treatment: 'I accept the plan of dental treatment, risk factors and treatment cost for myself / my children. The procedure & the potential complications (if any) were explained to me.',
      agree: 'I do hereby agree to undergo necessary treatment of myself/my dependent. The procedure & the potential complications (if any) were explained to me.',
    };
    const newConsent: PatientConsent = {
      patientId: selectedPatient.id,
      consentText: consentTexts[consentType] || consentTexts.agree,
      signatureName: String(fd.get('signatureName') ?? ''),
      signatureDate: String(fd.get('signatureDate') ?? new Date().toISOString().split('T')[0]),
      agreed: true,
    };
    saveConsent(selectedPatient.id, newConsent);
    setShowConsentModal(false);
    showToast('Consent saved!');
  };

  const renderPatientDetail = () => {
    if (!selectedPatient) return null;
    const totals = calculateTotals();
    const treatmentPlansTotalTk = treatmentPlans.reduce((sum, p) => sum + (parseFloat(String(p.cost)) || 0), 0);

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <button className="btn-back" onClick={() => setActiveNav('patients')}>
            <i className="fa-solid fa-arrow-left"></i> Back to Patients
          </button>
          <h1><i className="fa-solid fa-user"></i> {selectedPatient.name}</h1>
        </div>

        <div className="patient-profile">
          <div className="profile-header">
            <div className="profile-avatar">{selectedPatient.name.charAt(0)}</div>
            <div className="profile-info">
              <h2>{selectedPatient.name}</h2>
              <p><i className="fa-solid fa-phone"></i> {selectedPatient.phone}</p>
              <p><i className="fa-solid fa-id-card"></i> {selectedPatient.regNo}</p>
              {selectedPatient.email && <p><i className="fa-solid fa-envelope"></i> {selectedPatient.email}</p>}
            </div>
            <div className="profile-actions">
              <button className="btn-primary" onClick={() => selectPatientForPrescription(selectedPatient)}>
                <i className="fa-solid fa-prescription"></i> New Prescription
              </button>
              <button className="btn-secondary" onClick={() => { setAppointmentForm({ ...appointmentForm, patientId: selectedPatient.id }); setActiveNav('appointments'); }}>
                <i className="fa-solid fa-calendar-plus"></i> Book Appointment
              </button>
            </div>
          </div>

          <div className="profile-details">
            {/* Basic Info Card */}
            <div className="detail-card">
              <h4><i className="fa-solid fa-info-circle"></i> Basic Info</h4>
              <div className="detail-grid">
                <div><strong>Age:</strong> {selectedPatient.age || '-'}</div>
                <div><strong>Gender:</strong> {selectedPatient.gender || '-'}</div>
                <div><strong>Blood Group:</strong> {selectedPatient.bloodGroup || '-'}</div>
                <div><strong>Occupation:</strong> {selectedPatient.occupation || '-'}</div>
                <div><strong>Ref. By:</strong> {selectedPatient.refBy || '-'}</div>
                <div><strong>Address:</strong> {selectedPatient.address || '-'}</div>
              </div>
            </div>

            {/* Medical History Card */}
            <div className="detail-card">
              <h4><i className="fa-solid fa-notes-medical"></i> Medical History</h4>
              <div className="medical-history-tags">
                {MEDICAL_HISTORY_DISPLAY_ORDER.map(({ key, label, tagClass }) => {
                  if (!medicalHistory[key]) return null;
                  const cls = ['history-tag', tagClass].filter(Boolean).join(' ');
                  return (
                    <span key={String(key)} className={cls}>
                      {label}
                    </span>
                  );
                })}
                {MEDICAL_HISTORY_TEXT_DISPLAY.map(({ key, title }) => {
                  const raw = medicalHistory[key];
                  if (typeof raw !== 'string' || !raw.trim()) return null;
                  return (
                    <div key={String(key)} className="medical-history-text-note">
                      <strong>{title}:</strong> <span>{raw.trim()}</span>
                    </div>
                  );
                })}
                {!hasDisplayedMedicalHistory(medicalHistory) && (
                  <p className="empty-state-sm">No history recorded</p>
                )}
              </div>

              {/* Treatment plan snapshot (linked to Treatment Plan & Cost) */}
              <div className="past-work" style={{ marginTop: 12 }}>
                <p className="past-work-title">
                  <i className="fa-solid fa-clipboard-list"></i> Treatment plan &amp; cost (summary)
                </p>
                {treatmentPlans.length > 0 ? (
                  <>
                    <p className="empty-state-sm" style={{ marginBottom: 8 }}>
                      <strong>{treatmentPlans.length}</strong> line(s) ·{' '}
                      <strong>{treatmentPlansTotalTk.toLocaleString()} TK</strong> planned total
                    </p>
                    <ul className="past-work-list">
                      {treatmentPlans.slice(0, 4).map((p) => (
                        <li key={p.id}>
                          <span>Tooth {p.toothNumber || '—'}</span> — {p.procedure || p.diagnosis || '—'} ·{' '}
                          <strong>{(parseFloat(String(p.cost)) || 0).toLocaleString()} TK</strong>
                          {p.status ? <span style={{ opacity: 0.85 }}> ({p.status})</span> : null}
                        </li>
                      ))}
                    </ul>
                    {treatmentPlans.length > 4 && (
                      <p className="empty-state-sm">+{treatmentPlans.length - 4} more in Treatment Plan &amp; Cost…</p>
                    )}
                  </>
                ) : (
                  <p className="empty-state-sm">No treatment lines yet. Add a plan below or open the Treatment Plan tab.</p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => {
                      setEditingPlan(null);
                      setShowTreatmentPlanModal(true);
                    }}
                  >
                    <i className="fa-solid fa-plus"></i> Add treatment line
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setPatientProfileTab('treatment')}>
                    <i className="fa-solid fa-table-list"></i> Open Treatment Plan &amp; Cost
                  </button>
                </div>
              </div>

              {treatmentRecords.length > 0 && (
                <div className="past-work">
                  <p className="past-work-title">Past dental work</p>
                  <ul className="past-work-list">
                    {treatmentRecords.slice(0, 3).map(record => (
                      <li key={record.id}>
                        <span>{record.date}</span>{' '}
                        <span>— {record.treatmentDone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button className="btn-secondary btn-sm" onClick={() => setShowMedicalHistoryModal(true)}>
                <i className="fa-solid fa-edit"></i> Edit History
              </button>
            </div>

            {/* Dental Chart Card */}
            <div className="detail-card dental-chart-card">
              <div className="dental-chart-header">
                <h4><i className="fa-solid fa-tooth"></i> Dental Chart</h4>
                <div className="numbering-toggle">
                  <button 
                    className={`toggle-btn ${toothNumberingSystem === 'fdi' ? 'active' : ''}`}
                    onClick={() => setToothNumberingSystem('fdi')}
                  >
                    FDI
                  </button>
                  <button 
                    className={`toggle-btn ${toothNumberingSystem === 'universal' ? 'active' : ''}`}
                    onClick={() => setToothNumberingSystem('universal')}
                  >
                    Universal (1-32)
                  </button>
                </div>
              </div>
              
              {/* Teeth chart visual references above the interactive chart */}
              <div className="dental-chart-visual teeth-chart-above">
                <p className="dental-chart-visual-label">Tooth Numbering System (Front View / Side View)</p>
                <img src="/tooth-numbering-views.png" alt="Tooth Numbering System – Dentists Use" className="dental-chart-image secondary" />
              </div>
              
              <div className="dental-chart">
                <div className="chart-section">
                  <h5>{toothNumberingSystem === 'fdi' ? 'FDI Notation' : 'Universal Notation'} - Click to select teeth</h5>
                  <div className="teeth-grid">
                    {(toothNumberingSystem === 'fdi' ? TOOTH_CHART_FDI : TOOTH_CHART_UNIVERSAL).permanent.map((row, idx) => (
                      <div key={idx} className="teeth-row">
                        {row.numbers.map(num => (
                          <button 
                            key={num} 
                            className={`tooth-btn ${selectedTeeth.includes(num) ? 'selected' : ''}`}
                            onClick={() => toggleTooth(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {selectedTeeth.length > 0 && (
                <div className="selected-teeth-section">
                  <p className="selected-teeth"><strong>Selected Teeth:</strong> {selectedTeeth.join(', ')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-secondary btn-sm" onClick={() => setSelectedTeeth([])}>
                      <i className="fa-solid fa-times"></i> Clear Selection
                    </button>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => {
                        if (!selectedPatient) return;
                        setEditingPlan(null);
                        setShowTreatmentPlanModal(true);
                      }}
                    >
                      <i className="fa-solid fa-clipboard-list"></i> Add to Treatment Plan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chief Complaint & Clinical Findings */}
            <div className="detail-card clinical-notes-card">
              <h4><i className="fa-solid fa-stethoscope"></i> Clinical Notes</h4>
              <div className="clinical-notes-grid">
                <div className="clinical-field">
                  <label>Chief Complaint (C/C)</label>
                  <textarea 
                    placeholder="Enter patient's chief complaint..."
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />
                </div>
                <div className="clinical-field">
                  <label>Clinical Findings (C/F)</label>
                  <textarea 
                    placeholder="Enter clinical findings..."
                    value={clinicalFindings}
                    onChange={(e) => setClinicalFindings(e.target.value)}
                  />
                </div>
                <div className="clinical-field">
                  <label>Investigation (I/X)</label>
                  <textarea 
                    placeholder="Enter investigation details..."
                    value={investigation}
                    onChange={(e) => setInvestigation(e.target.value)}
                  />
                </div>
                <div className="clinical-field">
                  <label>Diagnosis</label>
                  <textarea 
                    placeholder="Enter diagnosis..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Treatment Cost Summary */}
            <div className="detail-card cost-summary-card">
              <h4><i className="fa-solid fa-calculator"></i> Treatment Cost</h4>
              <div className="cost-summary-grid">
                <div className="cost-item"><span>Total Cost:</span><strong>{totals.totalCost.toLocaleString()} TK</strong></div>
                <div className="cost-item"><span>Total Paid:</span><strong className="text-success">{totals.totalPaid.toLocaleString()} TK</strong></div>
                <div className="cost-item"><span>Due:</span><strong className="text-danger">{totals.totalDue.toLocaleString()} TK</strong></div>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="profile-tabs-section">
            <div className="profile-tabs">
              <button
                className={`profile-tab ${patientProfileTab === 'treatment' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('treatment')}
              >
                <i className="fa-solid fa-clipboard-list"></i> Treatment Plan & Cost
              </button>
              <button
                className={`profile-tab ${patientProfileTab === 'ledger' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('ledger')}
              >
                <i className="fa-solid fa-book"></i> Payment Ledger
              </button>
              <button
                className={`profile-tab ${patientProfileTab === 'record-form' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('record-form')}
              >
                <i className="fa-solid fa-id-card"></i> Edit Patient Profile
              </button>
              <button
                className={`profile-tab ${patientProfileTab === 'consent' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('consent')}
              >
                <i className="fa-solid fa-file-signature"></i> Consent
              </button>
            </div>

            {/* Treatment Plan Tab */}
            {patientProfileTab === 'treatment' && (
              <div className="tab-content">
                <div className="tab-header">
                  <div>
                    <h3>Treatment Plan &amp; Cost</h3>
                    <p className="empty-state-sm" style={{ margin: '4px 0 0' }}>
                      Planned treatments and costs for {selectedPatient.name}. Use actions to edit or remove a line.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setEditingPlan(null);
                        setShowTreatmentPlanModal(true);
                      }}
                    >
                      <i className="fa-solid fa-plus"></i> Add treatment line
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowMedicalHistoryModal(true)}>
                      <i className="fa-solid fa-notes-medical"></i> Medical History
                    </button>
                  </div>
                </div>
                <div className="treatment-table-wrap">
                  <table className="treatment-table">
                    <thead>
                      <tr>
                        <th>Tooth</th>
                        <th>Diagnosis</th>
                        <th>Procedure</th>
                        <th>Cost (TK)</th>
                        <th>CC</th>
                        <th>CF</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatmentPlans.map((p) => (
                        <tr key={p.id}>
                          <td>{p.toothNumber}</td>
                          <td>{p.diagnosis}</td>
                          <td>{p.procedure}</td>
                          <td>{p.cost}</td>
                          <td>{p.cc}</td>
                          <td>{p.cf}</td>
                          <td>{p.status || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="records-table-btn records-table-btn-view"
                                title="Edit"
                                onClick={() => {
                                  setEditingPlan(p);
                                  setShowTreatmentPlanModal(true);
                                }}
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button
                                type="button"
                                className="records-table-btn records-table-btn-delete"
                                title="Delete"
                                onClick={() => {
                                  if (window.confirm('Delete this treatment plan line?')) {
                                    handleDeleteTreatmentPlan(p);
                                  }
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>
                            {treatmentPlans
                              .reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0)
                              .toLocaleString()}{' '}
                            TK
                          </strong>
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                  {treatmentPlans.length === 0 && (
                    <p className="empty-state">No treatment plans yet. Click &quot;Add treatment line&quot; to create one.</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Ledger Tab */}
            {patientProfileTab === 'ledger' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Payment Ledger for {selectedPatient.name}</h3>
                  <button className="btn-primary" onClick={() => { setEditingRecord(null); setShowTreatmentRecordModal(true); }}>
                    <i className="fa-solid fa-plus"></i> Add Payment Record
                  </button>
                </div>
                <div className="treatment-table-wrap">
                  <table className="treatment-table ledger-table">
                    <thead>
                      <tr>
                        <th className="ledger-col-date">Date</th>
                        <th className="ledger-col-treatment">Treatment Done</th>
                        <th className="ledger-col-cost">Cost (TK)</th>
                        <th className="ledger-col-paid">Paid (TK)</th>
                        <th className="ledger-col-due">Due (TK)</th>
                        <th className="ledger-col-patsign">Pat. Sign</th>
                        <th className="ledger-col-docsign">Signature of Doctor</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatmentRecords.map((record, idx) => (
                        <tr key={record.id} className={`ledger-row ledger-row-${idx % 4}`}>
                          <td>{record.date}</td>
                          <td>{record.treatmentDone}</td>
                          <td>{parseFloat(record.cost || '0').toLocaleString()}</td>
                          <td>{parseFloat(record.paid || '0').toLocaleString()}</td>
                          <td>{parseFloat(record.due || '0').toLocaleString()}</td>
                          <td>{record.patientSignature || '—'}</td>
                          <td>{record.doctorSignature || '—'}</td>
                          <td className="action-cell">
                            <button className="btn-icon" onClick={() => { setEditingRecord(record); setShowTreatmentRecordModal(true); }}><i className="fa-solid fa-edit"></i></button>
                            <button className="btn-icon danger" onClick={() => handleDeleteTreatmentRecord(record)}><i className="fa-solid fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2}><strong>Total</strong></td>
                        <td><strong>{totals.totalCost.toLocaleString()}</strong></td>
                        <td><strong className="text-success">{totals.totalPaid.toLocaleString()}</strong></td>
                        <td><strong className="text-danger">{totals.totalDue.toLocaleString()}</strong></td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                  {treatmentRecords.length === 0 && <p className="empty-state">No records yet</p>}
                </div>
              </div>
            )}

            {/* Edit Patient Profile Tab */}
            {patientProfileTab === 'record-form' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Edit Patient Profile</h3>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => openPatientRecordFormPrint()}
                      title="Opens a print-ready page. Use Print -> Save as PDF."
                    >
                      <i className="fa-solid fa-print"></i> Print / Save PDF
                    </button>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        if (!selectedPatient) return;

                        // Persist the lightweight profile form (for print, etc.)
                        savePatientRecordForm(selectedPatient.id, patientRecordForm);

                        // Update core patient profile so Patients list and header stay in sync
                        const updatedPatient: Patient = {
                          ...selectedPatient,
                          regNo: patientRecordForm.regNo || selectedPatient.regNo,
                          name: patientRecordForm.name || selectedPatient.name,
                          age: patientRecordForm.age || selectedPatient.age,
                          phone: patientRecordForm.mobile || selectedPatient.phone,
                          address: patientRecordForm.address || selectedPatient.address,
                          occupation: patientRecordForm.occupation || selectedPatient.occupation,
                          refBy: patientRecordForm.refBy || selectedPatient.refBy,
                        };

                        try {
                          if (api.getToken()) {
                            await api.patients.update(updatedPatient.id, {
                              name: updatedPatient.name,
                              phone: updatedPatient.phone,
                              age: updatedPatient.age ? parseInt(String(updatedPatient.age), 10) : undefined,
                              gender: updatedPatient.gender || undefined,
                              email: updatedPatient.email || undefined,
                              address: updatedPatient.address || undefined,
                              bloodGroup: updatedPatient.bloodGroup || undefined,
                              occupation: updatedPatient.occupation || undefined,
                              referredBy: updatedPatient.refBy || undefined,
                              regNo: updatedPatient.regNo || undefined,
                            });
                            await loadData();
                          } else {
                            const nextPatients = patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
                            savePatients(nextPatients);
                          }

                          setSelectedPatient(updatedPatient);
                          showToast('Patient profile updated');
                        } catch (e: any) {
                          showToast(e?.message ?? 'Failed to update patient profile');
                        }
                      }}
                    >
                      <i className="fa-solid fa-save"></i> Save Profile
                    </button>
                  </div>
                </div>

                {/* Basic patient info – just the essentials */}
                <div className="detail-card" style={{ marginTop: 12 }}>
                  <div className="clinical-notes-grid">
                    <div className="clinical-field">
                      <label>Reg. No.</label>
                      <input
                        value={patientRecordForm.regNo}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, regNo: e.target.value }))}
                        placeholder="Reg. No."
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Name</label>
                      <input
                        value={patientRecordForm.name}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Patient name"
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Age</label>
                      <input
                        value={patientRecordForm.age}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, age: e.target.value }))}
                        placeholder="Age"
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Mob.</label>
                      <input
                        value={patientRecordForm.mobile}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, mobile: e.target.value }))}
                        placeholder="Mobile"
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Address</label>
                      <input
                        value={patientRecordForm.address}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Address"
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Ref.</label>
                      <input
                        value={patientRecordForm.refBy}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, refBy: e.target.value }))}
                        placeholder="Ref.: ..."
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Occupation</label>
                      <input
                        value={patientRecordForm.occupation}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, occupation: e.target.value }))}
                        placeholder="Occupation"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical history lives in its own modal; keep only a link here */}
                <div className="detail-card" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0 }}><i className="fa-solid fa-notes-medical"></i> Medical History</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-secondary btn-sm" onClick={() => setShowMedicalHistoryModal(true)}>
                        <i className="fa-solid fa-pen-to-square"></i> Edit Medical History
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setPatientProfileTab('treatment');
                          setEditingPlan(null);
                          setShowTreatmentPlanModal(true);
                        }}
                      >
                        <i className="fa-solid fa-plus"></i> Add treatment / cost line
                      </button>
                    </div>
                  </div>
                  <p className="empty-state-sm" style={{ marginTop: 8 }}>
                    Full medical history is in the popup. Treatment plans and costs are managed under the <strong>Treatment Plan &amp; Cost</strong> tab (summary also appears on the main patient view Medical History card).
                  </p>
                </div>

                {/* Short clinical summary for real‑life use */}
                <div className="detail-card" style={{ marginTop: 12 }}>
                  <h4><i className="fa-solid fa-stethoscope"></i> Diagnosis</h4>
                  <textarea
                    value={patientRecordForm.diagnosisText}
                    onChange={(e) => setPatientRecordForm((p) => ({ ...p, diagnosisText: e.target.value }))}
                    placeholder="Diagnosis"
                    rows={3}
                  />
                </div>

                <div className="detail-card" style={{ marginTop: 12 }}>
                  <h4><i className="fa-solid fa-clipboard-list"></i> Examination Notes</h4>
                  <textarea
                    value={patientRecordForm.examinationNotes}
                    onChange={(e) => setPatientRecordForm((p) => ({ ...p, examinationNotes: e.target.value }))}
                    placeholder="Examination / important chairside notes"
                    rows={3}
                  />
                </div>

                {/* Simple cost + consent section kept for print */}
                <div className="detail-card" style={{ marginTop: 12 }}>
                  <h4><i className="fa-solid fa-calculator"></i> Cost</h4>
                  <div className="clinical-notes-grid">
                    <div className="clinical-field">
                      <label>Total</label>
                      <input
                        value={patientRecordForm.costTotal}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, costTotal: e.target.value }))}
                        placeholder="Total ="
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Cost payer text</label>
                      <input
                        value={patientRecordForm.costPayerText}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, costPayerText: e.target.value }))}
                        placeholder='of myself/my ____'
                      />
                    </div>
                  </div>
                </div>

                <div className="detail-card" style={{ marginTop: 12 }}>
                  <h4><i className="fa-solid fa-file-signature"></i> Agreement</h4>
                  <div className="checkbox-grid">
                    <label>
                      <input
                        type="checkbox"
                        checked={patientRecordForm.agreeToTreatment}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, agreeToTreatment: e.target.checked }))}
                      />{' '}
                      I do hereby agree to undergo necessary treatment
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={patientRecordForm.explainedComplications}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, explainedComplications: e.target.checked }))}
                      />{' '}
                      The procedure & potential complications were explained to me
                    </label>
                  </div>

                  <div className="clinical-notes-grid" style={{ marginTop: 10 }}>
                    <div className="clinical-field">
                      <label>Date</label>
                      <input
                        type="date"
                        value={patientRecordForm.consentDate}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, consentDate: e.target.value }))}
                      />
                    </div>
                    <div className="clinical-field">
                      <label>Signature/Name</label>
                      <input
                        value={patientRecordForm.signatureName}
                        onChange={(e) => setPatientRecordForm((p) => ({ ...p, signatureName: e.target.value }))}
                        placeholder="Signature/Name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Consent Tab */}
            {patientProfileTab === 'consent' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Patient Consent</h3>
                  <button className="btn-primary" onClick={() => setShowConsentModal(true)}>
                    <i className="fa-solid fa-file-signature"></i> {consent?.agreed ? 'Update' : 'Add'} Consent
                  </button>
                </div>
                <div className="consent-display">
                  {consent?.agreed ? (
                    <div className="consent-signed">
                      <p><i className="fa-solid fa-check-circle text-success"></i> Consent has been signed</p>
                      <div className="consent-details">
                        <p><strong>Name:</strong> {consent.signatureName}</p>
                        <p><strong>Date:</strong> {consent.signatureDate}</p>
                        <p className="consent-text">{consent.consentText}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-state">No consent recorded. Click "Add Consent" to record patient consent.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical History Modal */}
        {showMedicalHistoryModal && (
          <div className="modal-overlay" onClick={() => setShowMedicalHistoryModal(false)}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fa-solid fa-notes-medical"></i> Medical History</h2>
                <button className="modal-close" onClick={() => setShowMedicalHistoryModal(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <form
                key={selectedPatient ? `medical-history-${selectedPatient.id}` : 'medical-history'}
                onSubmit={handleSaveMedicalHistory}
                className="medical-history-form"
              >
                <div className="history-section">
                  <h4>Diseases Like</h4>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" name="bloodPressure" defaultChecked={medicalHistory.bloodPressure} /> Blood Pressure (High/Low)</label>
                    <label><input type="checkbox" name="heartProblems" defaultChecked={medicalHistory.heartProblems} /> Heart Problems</label>
                    <label><input type="checkbox" name="cardiacHtnMiPacemaker" defaultChecked={medicalHistory.cardiacHtnMiPacemaker} /> Cardiac Problem (HTN / MI / Pacemaker / Ring)</label>
                    <label><input type="checkbox" name="rheumaticFever" defaultChecked={medicalHistory.rheumaticFever} /> RF (Rheumatic Fever)</label>
                    <label><input type="checkbox" name="diabetes" defaultChecked={medicalHistory.diabetes} /> Diabetes</label>
                    <label><input type="checkbox" name="pepticUlcer" defaultChecked={medicalHistory.pepticUlcer} /> Peptic Ulcer / Acidity</label>
                    <label><input type="checkbox" name="jaundice" defaultChecked={medicalHistory.jaundice} /> Jaundice/Liver Diseases</label>
                    <label><input type="checkbox" name="asthma" defaultChecked={medicalHistory.asthma} /> Asthma</label>
                    <label><input type="checkbox" name="tuberculosis" defaultChecked={medicalHistory.tuberculosis} /> Tuberculosis</label>
                    <label><input type="checkbox" name="kidneyDiseases" defaultChecked={medicalHistory.kidneyDiseases} /> Kidney Diseases</label>
                    <label><input type="checkbox" name="aids" defaultChecked={medicalHistory.aids} /> AIDS</label>
                    <label><input type="checkbox" name="thyroid" defaultChecked={medicalHistory.thyroid} /> Thyroid</label>
                    <label><input type="checkbox" name="hepatitis" defaultChecked={medicalHistory.hepatitis} /> Hepatitis</label>
                    <label><input type="checkbox" name="stroke" defaultChecked={medicalHistory.stroke} /> Stroke</label>
                    <label><input type="checkbox" name="bleedingDisorder" defaultChecked={medicalHistory.bleedingDisorder} /> Bleeding Disorder</label>
                  </div>
                  <input type="text" name="otherDiseases" placeholder="Other diseases..." defaultValue={medicalHistory.otherDiseases} />
                </div>

                <div className="history-section">
                  <h4>If Female</h4>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" name="isPregnant" defaultChecked={medicalHistory.isPregnant} /> Pregnant</label>
                    <label><input type="checkbox" name="isLactating" defaultChecked={medicalHistory.isLactating} /> Lactating Mother</label>
                  </div>
                </div>

                <div className="history-section">
                  <h4>Allergic to</h4>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" name="allergyPenicillin" defaultChecked={medicalHistory.allergyPenicillin} /> Penicillin</label>
                    <label><input type="checkbox" name="allergySulphur" defaultChecked={medicalHistory.allergySulphur} /> Sulphur</label>
                    <label><input type="checkbox" name="allergyAspirin" defaultChecked={medicalHistory.allergyAspirin} /> Aspirin</label>
                    <label><input type="checkbox" name="allergyLocalAnaesthesia" defaultChecked={medicalHistory.allergyLocalAnaesthesia} /> Local Anaesthesia</label>
                  </div>
                  <input type="text" name="allergyOther" placeholder="Other allergies..." defaultValue={medicalHistory.allergyOther} />
                </div>

                <div className="history-section">
                  <h4>Taking Drug</h4>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" name="takingAspirinBloodThinner" defaultChecked={medicalHistory.takingAspirinBloodThinner} /> Aspirin/Blood Thinner</label>
                    <label><input type="checkbox" name="takingAntihypertensive" defaultChecked={medicalHistory.takingAntihypertensive} /> Antihypertensive</label>
                    <label><input type="checkbox" name="takingInhaler" defaultChecked={medicalHistory.takingInhaler} /> Inhaler</label>
                  </div>
                  <input type="text" name="takingOther" placeholder="Other drugs..." defaultValue={medicalHistory.takingOther} />
                </div>

                <div className="history-section">
                  <h4>Bad Habits Like</h4>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" name="habitSmoking" defaultChecked={medicalHistory.habitSmoking} /> Smoking</label>
                    <label><input type="checkbox" name="habitBetelLeaf" defaultChecked={medicalHistory.habitBetelLeaf} /> Chewing Betel Leaf/Nut</label>
                    <label><input type="checkbox" name="habitAlcohol" defaultChecked={medicalHistory.habitAlcohol} /> Alcohol</label>
                  </div>
                  <input type="text" name="habitOther" placeholder="Other habits..." defaultValue={medicalHistory.habitOther} />
                </div>

                <div className="history-section">
                  <h4>Additional Details</h4>
                  <textarea name="details" placeholder="Any additional details..." defaultValue={medicalHistory.details}></textarea>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowMedicalHistoryModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Medical History</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Treatment Plan Modal */}
        {showTreatmentPlanModal && (
          <div className="modal-overlay" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fa-solid fa-clipboard-list"></i> {editingPlan ? 'Edit' : 'Add'} Treatment Plan</h2>
                <button className="modal-close" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}><i className="fa-solid fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveTreatmentPlan} className="treatment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tooth Number</label>
                    <input type="text" name="toothNumber" placeholder="e.g., 11, 21" defaultValue={editingPlan?.toothNumber || selectedTeeth.join(', ')} />
                  </div>
                  <div className="form-group">
                    <label>Diagnosis</label>
                    <select name="diagnosis" defaultValue={editingPlan?.diagnosis}>
                      <option value="">Select Diagnosis</option>
                      {DIAGNOSIS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Treatment</label>
                    <select name="procedure" defaultValue={editingPlan?.procedure}>
                      <option value="">Select Treatment</option>
                      {TREATMENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cost (TK)</label>
                    <input type="number" name="cost" placeholder="0" defaultValue={editingPlan?.cost} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>C/C (Chief Complaint)</label>
                    <input type="text" name="cc" placeholder="Chief complaint" defaultValue={editingPlan?.cc} />
                  </div>
                  <div className="form-group">
                    <label>C/F (Clinical Findings)</label>
                    <input type="text" name="cf" placeholder="Clinical findings" defaultValue={editingPlan?.cf} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Investigation</label>
                    <input type="text" name="investigation" placeholder="Investigation" defaultValue={editingPlan?.investigation} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" defaultValue={editingPlan?.status || 'Not Start'}>
                      <option value="Not Start">Not Start</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingPlan ? 'Update' : 'Add'} Treatment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Treatment Record Modal */}
        {showTreatmentRecordModal && (
          <div className="modal-overlay" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fa-solid fa-book"></i> {editingRecord ? 'Edit' : 'Add'} Payment Record</h2>
                <button className="modal-close" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}><i className="fa-solid fa-times"></i></button>
              </div>
              <p style={{ margin: '12px 24px 0', color: 'var(--neo-text-muted)', fontSize: 12 }}>
                Cost and Paid are in TK. Due is auto-calculated as <strong>Cost - Paid</strong>.
              </p>
              <form onSubmit={handleSaveTreatmentRecord} className="treatment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date (Payment Date)</label>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={editingRecord?.date || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Treatment Done (short note)</label>
                    <input
                      type="text"
                      name="treatmentDone"
                      required
                      placeholder="e.g., Treatment completed"
                      defaultValue={editingRecord?.treatmentDone}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Cost (TK)</label>
                    <input
                      type="number"
                      name="cost"
                      min={0}
                      step="0.01"
                      required
                      placeholder="0"
                      value={paymentCostInput}
                      onChange={(e) => setPaymentCostInput(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Paid (TK)</label>
                    <input
                      type="number"
                      name="paid"
                      min={0}
                      step="0.01"
                      required
                      placeholder="0"
                      value={paymentPaidInput}
                      onChange={(e) => setPaymentPaidInput(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due (Auto)</label>
                    <input
                      type="number"
                      name="due"
                      min={0}
                      step="0.01"
                      readOnly
                      value={paymentDuePreview}
                    />
                  </div>
                  <div className="form-group">
                    <label>Patient/Attendant Sign (name)</label>
                    <input
                      type="text"
                      name="patientSignature"
                      placeholder="Patient or attendant name"
                      defaultValue={editingRecord?.patientSignature}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Doctor Signature (name)</label>
                    <input
                      type="text"
                      name="doctorSignature"
                      placeholder="Doctor name"
                      defaultValue={editingRecord?.doctorSignature}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingRecord ? 'Update' : 'Add'} Payment Record</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Consent Modal */}
        {showConsentModal && (
          <div className="modal-overlay" onClick={() => setShowConsentModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fa-solid fa-file-signature"></i> Patient Consent</h2>
                <button className="modal-close" onClick={() => setShowConsentModal(false)}><i className="fa-solid fa-times"></i></button>
              </div>
              <form onSubmit={handleSaveConsent} className="consent-form">
                <div className="form-group">
                  <label>Consent statement</label>
                  <select name="consentType">
                    <option value="treatment">I accept the plan of dental treatment, risk factors and treatment cost for myself / my children.</option>
                    <option value="agree">I do hereby agree to undergo necessary treatment of myself/my dependent.</option>
                  </select>
                </div>
                <div className="consent-text-box">
                  <p>The procedure & the potential complications (if any) were explained to me.</p>
                </div>
                <div className="form-group">
                  <label>Signature of Patient / Attendant</label>
                  <input type="text" name="signatureName" placeholder="Full name" defaultValue={consent?.signatureName || selectedPatient.name} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" name="signatureDate" defaultValue={consent?.signatureDate || new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowConsentModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Consent</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrescription = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-prescription"></i> New Prescription</h1>
      </div>

      <div className="prescription-layout">
        <div className="prescription-form-panel">
          <div className="form-section">
            <h3><i className="fa-solid fa-user"></i> Patient</h3>
            <div className="form-group">
              <label>Select Patient *</label>
              <select value={prescriptionForm.patientId} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })}>
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
                ))}
              </select>
            </div>
            {prescriptionForm.patientId && (
              <div className="selected-patient-info">
                {(() => {
                  const p = patients.find(p => p.id === prescriptionForm.patientId);
                  return p ? (
                    <div className="patient-badge">
                      <span className="patient-avatar-sm">{p.name.charAt(0)}</span>
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.age} / {p.gender}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3><i className="fa-solid fa-stethoscope"></i> Diagnosis</h3>
            <div className="form-group">
              <label>Diagnosis / Chief Complaint</label>
              <textarea value={prescriptionForm.diagnosis} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })} placeholder="Enter diagnosis..." />
            </div>
          </div>

          <div className="form-section">
            <h3><i className="fa-solid fa-pills"></i> Medications</h3>
            <div className="drug-search-box">
              <input 
                type="text" 
                placeholder="Search drug..." 
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
              />
              {drugSearch && (
                <div className="drug-dropdown">
                  {filteredDrugs.slice(0, 8).map(d => (
                    <div key={d.brand} className="drug-option" onClick={() => { setDrugForm({ ...drugForm, brand: d.brand }); setDrugSearch(''); }}>
                      <strong>{d.brand}</strong>
                      <span>{d.generic} - {d.strength}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="drug-form-row">
              <input type="text" placeholder="Drug Name" value={drugForm.brand} onChange={(e) => setDrugForm({ ...drugForm, brand: e.target.value })} />
              <input type="text" placeholder="Dose" value={drugForm.dose} onChange={(e) => setDrugForm({ ...drugForm, dose: e.target.value })} />
              <input type="text" placeholder="Duration" value={drugForm.duration} onChange={(e) => setDrugForm({ ...drugForm, duration: e.target.value })} />
              <select value={drugForm.frequency} onChange={(e) => setDrugForm({ ...drugForm, frequency: e.target.value })}>
                <option value="1-0-0">1-0-0</option>
                <option value="0-1-0">0-1-0</option>
                <option value="0-0-1">0-0-1</option>
                <option value="1-1-0">1-1-0</option>
                <option value="1-0-1">1-0-1</option>
                <option value="0-1-1">0-1-1</option>
                <option value="1-1-1">1-1-1</option>
                <option value="SOS">SOS</option>
                <option value="OD">OD</option>
                <option value="BD">BD</option>
                <option value="TDS">TDS</option>
              </select>
              <button className="btn-add-drug" onClick={handleAddDrug}><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="drug-timing">
              <label><input type="checkbox" checked={drugForm.beforeFood} onChange={(e) => setDrugForm({ ...drugForm, beforeFood: e.target.checked })} /> Before Food</label>
              <label><input type="checkbox" checked={drugForm.afterFood} onChange={(e) => setDrugForm({ ...drugForm, afterFood: e.target.checked })} /> After Food</label>
            </div>

            {prescriptionForm.drugs.length > 0 && (
              <div className="drugs-list">
                <h4>Added Drugs ({prescriptionForm.drugs.length})</h4>
                <table className="drugs-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Drug</th>
                      <th>Dose</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Timing</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionForm.drugs.map((d, i) => (
                      <tr key={d.id}>
                        <td>{i + 1}</td>
                        <td>{d.brand}</td>
                        <td>{d.dose}</td>
                        <td>{d.frequency}</td>
                        <td>{d.duration}</td>
                        <td>{d.beforeFood ? 'Before' : ''}{d.afterFood ? 'After' : ''} Food</td>
                        <td>
                          <button className="btn-remove" onClick={() => setPrescriptionForm({ ...prescriptionForm, drugs: prescriptionForm.drugs.filter(x => x.id !== d.id) })}>
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3><i className="fa-solid fa-comment-medical"></i> Advice</h3>
            <div className="form-group">
              <textarea value={prescriptionForm.advice} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, advice: e.target.value })} placeholder="Additional advice for patient..." />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary btn-lg" onClick={handleSavePrescription}>
              <i className="fa-solid fa-save"></i> Save Prescription
            </button>
            <button className="btn-secondary btn-lg" onClick={() => { handleSavePrescription(); showToast('Print dialog would open'); }}>
              <i className="fa-solid fa-print"></i> Save & Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrescriptionsList = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-file-medical"></i> All Prescriptions</h1>
        <button className="btn-primary" onClick={() => setActiveNav('prescription')}>
          <i className="fa-solid fa-plus"></i> New Prescription
        </button>
      </div>

      <div className="prescriptions-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Diagnosis</th>
              <th>Drugs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map(rx => (
              <tr key={rx.id}>
                <td>{rx.date}</td>
                <td>{rx.patientName}</td>
                <td>{rx.diagnosis || '-'}</td>
                <td>{rx.drugs.length} drug(s)</td>
                <td className="action-cell">
                  <button className="btn-icon" title="View"><i className="fa-solid fa-eye"></i></button>
                  <button className="btn-icon" title="Print"><i className="fa-solid fa-print"></i></button>
                  <button className="btn-icon" title="WhatsApp"><i className="fa-brands fa-whatsapp"></i></button>
                  <button className="btn-icon" title="Email"><i className="fa-solid fa-envelope"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prescriptions.length === 0 && <p className="empty-state">No prescriptions yet</p>}
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="dashboard-content">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1><i className="fa-solid fa-calendar-check"></i> Appointments</h1>
          <p><span className="highlight">Schedule & filter</span> — {filteredAppointments.length} shown</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'upcoming' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentScheduleFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'today' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentScheduleFilter('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'week' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentScheduleFilter('week')}
          >
            Next 7 days
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'all' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentScheduleFilter('all')}
          >
            All
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={exportAppointmentsCsv} disabled={filteredAppointments.length === 0}>
            <i className="fa-solid fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="appointments-page-card">
        <div className="appointments-inner-grid">
        <div className="form-panel appointments-form-panel">
          <h3><i className="fa-solid fa-calendar-plus"></i> Appointment Details</h3>
          <div className="appointments-form-grid">
            <div className="appointments-field appointments-field-full">
              <label>Patient <span className="required">*</span></label>
              <select
                className="appointments-input"
                value={appointmentForm.patientId}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })}
              >
                <option value="">-- Select Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="appointments-field">
              <label>Date <span className="required">*</span></label>
              <input
                className="appointments-input"
                type="date"
                value={appointmentForm.date}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
              />
            </div>

            <div className="appointments-field">
              <label>Time <span className="required">*</span></label>
              <input
                className="appointments-input"
                type="time"
                value={appointmentForm.time}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
              />
            </div>

            <div className="appointments-field">
              <label>Type</label>
              <select
                className="appointments-input"
                value={appointmentForm.type}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
              >
                <option value="Checkup">Checkup</option>
                <option value="Treatment">Treatment</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Emergency">Emergency</option>
                <option value="Consultation">Consultation</option>
              </select>
            </div>

            <div className="appointments-field appointments-field-action">
              <button className="btn-primary appointments-schedule-btn" onClick={handleAddAppointment} type="button">
                <i className="fa-solid fa-plus" aria-hidden="true"></i> Schedule Appointment
              </button>
            </div>
          </div>
        </div>

        <div className="list-panel">
          <h3><i className="fa-solid fa-list"></i> Appointment list</h3>
          <div className="appointments-list">
            {appointments.length === 0 ? (
              <p className="empty-state">No appointments scheduled</p>
            ) : filteredAppointments.length === 0 ? (
              <p className="empty-state">No appointments match this filter</p>
            ) : (
              filteredAppointments.map(apt => (
                <div key={apt.id} className="appointment-card">
                  <div className="apt-date-block">
                    {(() => {
                      const d0 = parseAppointmentStartLocal(apt);
                      return (
                        <>
                          <span className="apt-day">{d0.getDate()}</span>
                          <span className="apt-month">{d0.toLocaleString('default', { month: 'short' })}</span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="apt-details">
                    <strong>{apt.patientName}</strong>
                    <span><i className="fa-solid fa-clock"></i> {apt.time}</span>
                    <span><i className="fa-solid fa-tag"></i> {apt.type}</span>
                  </div>
                  <div className="apt-actions">
                  <span className={`apt-status status-${apt.status.toLowerCase()}`}>{prettifyAppointmentStatus(apt.status)}</span>

                  <a
                    className="apt-action-btn"
                    style={{ textDecoration: 'none' }}
                    title="Add to Google Calendar"
                    href={getGoogleCalendarUrl(apt)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-solid fa-calendar-plus" aria-hidden="true"></i>
                    Google
                  </a>

                  <button
                    className="apt-action-btn"
                    title="Download ICS (Apple Calendar / others)"
                    type="button"
                    onClick={() => downloadAppointmentIcs(apt)}
                  >
                    <i className="fa-solid fa-file-signature" aria-hidden="true"></i>
                    ICS
                  </button>

                  <button
                    className="apt-action-btn"
                    title="Send appointment reminder"
                    type="button"
                    onClick={() => handleSendAppointmentReminder(apt.id)}
                  >
                    <i className="fa-solid fa-bell" aria-hidden="true"></i>
                    Remind
                  </button>

                  {String(apt.status || '').toUpperCase() === 'SCHEDULED' && (
                    <button
                      className="apt-action-btn"
                      title="Confirm appointment"
                      type="button"
                      onClick={() => handleConfirmAppointment(apt.id)}
                    >
                      <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                      Confirm
                    </button>
                  )}

                  {(String(apt.status || '').toUpperCase() === 'SCHEDULED' ||
                    String(apt.status || '').toUpperCase() === 'CONFIRMED') && (
                    <button
                      className="apt-action-btn apt-action-btn-danger"
                      title="Cancel appointment"
                      type="button"
                      onClick={() => handleCancelAppointment(apt.id)}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                      Cancel
                    </button>
                  )}

                  {String(apt.status || '').toUpperCase() === 'CONFIRMED' && (
                    <button
                      className="apt-action-btn"
                      title="Mark appointment completed"
                      type="button"
                      onClick={() => handleCompleteAppointment(apt.id)}
                    >
                      <i className="fa-solid fa-clipboard-check" aria-hidden="true"></i>
                      Complete
                    </button>
                  )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );

  const handleAddCustomLine = () => {
    const desc = customLineDescription.trim();
    const amount = parseFloat(customLineAmount) || 0;
    if (!desc) return;
    setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: desc, amount }] });
    setCustomLineDescription('');
    setCustomLineAmount('');
  };

  const renderBilling = () => (
    <div className="dashboard-content">
      <div className="billing-page-layout">
        <div className="billing-form-card">
          <h1 className="billing-title"><i className="fa-solid fa-file-invoice-dollar"></i> Billing & Invoices</h1>
          <form className="billing-form-vertical" onSubmit={e => { e.preventDefault(); handleCreateInvoice(); }}>
            <div className="form-field">
              <label>Patient</label>
              <select
                className="billing-select"
                value={invoiceForm.patientId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                required
              >
                <option value="">-- Select Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Due date (optional)</label>
              <input
                type="date"
                className="billing-input"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              />
              <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--neo-text-muted)' }}>
                Used to flag overdue balances on the dashboard and invoice list.
              </span>
            </div>
            <div className="form-field">
              <label>Custom add service</label>
              <div className="billing-custom-row">
                <input
                  type="text"
                  className="billing-input"
                  placeholder="Service name"
                  value={customLineDescription}
                  onChange={(e) => setCustomLineDescription(e.target.value)}
                />
                <input
                  type="number"
                  className="billing-input billing-amount"
                  placeholder="Amount"
                  min={0}
                  step={1}
                  value={customLineAmount}
                  onChange={(e) => setCustomLineAmount(e.target.value)}
                />
                <button type="button" className="btn-primary billing-add-btn" onClick={handleAddCustomLine}>
                  <i className="fa-solid fa-plus"></i> Add
                </button>
              </div>
            </div>
            <div className="form-field">
              <label>Quick add procedures</label>
              <div className="procedure-buttons">
                {billingProcedures.map((proc) => (
                  <button key={proc} className="procedure-btn" type="button" onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: proc, amount: 500 }] })}>
                    {proc}
                  </button>
                ))}
              </div>
            </div>
            {invoiceForm.items.length > 0 && (
              <div className="invoice-items-list">
                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="invoice-item-row">
                    <span>{item.description}</span>
                    <input type="number" value={item.amount} onChange={(e) => {
                      const newItems = [...invoiceForm.items];
                      newItems[idx].amount = parseFloat(e.target.value) || 0;
                      setInvoiceForm({ ...invoiceForm, items: newItems });
                    }} />
                    <button className="btn-remove" onClick={() => setInvoiceForm({ ...invoiceForm, items: invoiceForm.items.filter((_, i) => i !== idx) })}>
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                ))}
                <div className="invoice-total">
                  <span>Total: ৳{invoiceForm.items.reduce((sum, i) => sum + i.amount, 0) - invoiceForm.discount}</span>
                </div>
              </div>
            )}
            <div className="billing-actions">
              <button type="submit" className="btn-primary">
                <i className="fa-solid fa-file-invoice"></i> Create Invoice
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (!invoices.length) { showToast('No invoices to print yet'); return; }
                  handlePrintInvoice(invoices[0]);
                }}
              >
                <i className="fa-solid fa-print"></i> Print
              </button>
            </div>
          </form>
        </div>
        <div className="billing-list-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}><i className="fa-solid fa-list"></i> Invoices</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className={`btn-secondary btn-sm ${billingInvoiceFilter === 'all' ? 'billing-filter-active' : ''}`}
                onClick={() => setBillingInvoiceFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn-secondary btn-sm ${billingInvoiceFilter === 'open' ? 'billing-filter-active' : ''}`}
                onClick={() => setBillingInvoiceFilter('open')}
              >
                Open
              </button>
              <button
                type="button"
                className={`btn-secondary btn-sm ${billingInvoiceFilter === 'overdue' ? 'billing-filter-active' : ''}`}
                onClick={() => setBillingInvoiceFilter('overdue')}
              >
                Overdue
              </button>
              <button
                type="button"
                className={`btn-secondary btn-sm ${billingInvoiceFilter === 'paid' ? 'billing-filter-active' : ''}`}
                onClick={() => setBillingInvoiceFilter('paid')}
              >
                Paid
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={exportInvoicesCsv} disabled={filteredInvoicesForBilling.length === 0}>
                <i className="fa-solid fa-file-csv"></i> Export CSV
              </button>
            </div>
          </div>
          <div className="invoices-list">
            {invoices.length === 0 ? (
              <p className="empty-state">No invoices yet</p>
            ) : filteredInvoicesForBilling.length === 0 ? (
              <p className="empty-state">No invoices in this view</p>
            ) : (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Due</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoicesForBilling.map(inv => (
                    <tr key={inv.id} className={invoiceIsOverdue(inv) ? 'invoice-row-overdue' : undefined}>
                      <td>{inv.invoiceNo}</td>
                      <td>{inv.patientName}</td>
                      <td>{inv.date}</td>
                      <td>{inv.dueDate || '—'}</td>
                      <td>৳{inv.total}</td>
                      <td>৳{inv.paid}</td>
                      <td>৳{inv.due}</td>
                      <td>
                        <span className={`status-badge status-${inv.status.toLowerCase()}`}>{inv.status}</span>
                        {invoiceIsOverdue(inv) ? (
                          <span className="overdue-pill" title="Past due date or marked overdue">Overdue</span>
                        ) : null}
                      </td>
                      <td className="invoice-actions-cell">
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handlePrintMushok63(inv)}
                            title="Print Mushok 6.3"
                          >
                            <i className="fa-solid fa-print"></i>
                            <span>Print Mushok 6.3</span>
                          </button>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => handlePrintInvoice(inv)}
                            title="Print Invoice"
                          >
                            <i className="fa-solid fa-print"></i>
                            <span>Print Invoice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLab = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-flask"></i> Lab Orders</h1>
      </div>

      <div className="lab-orders-page-card">
        <div className="lab-orders-inner-grid">
          <div className="form-panel lab-form-panel-full lab-orders-form-panel">
            <h3><i className="fa-solid fa-plus"></i> Create Lab Order</h3>

            <div className="lab-form-sections">
              <div className="lab-form-section">
                <div className="lab-form-section-title">
                  <i className="fa-solid fa-clipboard-check"></i> Order Details
                </div>

                <div className="appointments-form-grid lab-order-grid">
                  <div className="appointments-field appointments-field-full">
                    <label>Patient <span className="required">*</span></label>
                    <select
                      className="appointments-input"
                      value={labForm.patientId}
                      onChange={(e) => setLabForm({ ...labForm, patientId: e.target.value })}
                    >
                      <option value="">-- Select Patient --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="appointments-field">
                    <label>Work Type <span className="required">*</span></label>
                    <select
                      className="appointments-input"
                      value={labForm.workType}
                      onChange={(e) => setLabForm({ ...labForm, workType: e.target.value })}
                    >
                      <option value="Crown">Crown</option>
                      <option value="Bridge">Bridge</option>
                      <option value="Denture">Denture (Complete)</option>
                      <option value="Partial Denture">Partial Denture</option>
                      <option value="Aligners">Aligners</option>
                      <option value="Retainer">Retainer</option>
                      <option value="Night Guard">Night Guard</option>
                      <option value="Veneer">Veneer</option>
                      <option value="Implant Crown">Implant Crown</option>
                    </select>
                  </div>

                  <div className="appointments-field">
                    <label>Tooth Number</label>
                    <input
                      className="appointments-input"
                      type="text"
                      value={labForm.toothNumber}
                      onChange={(e) => setLabForm({ ...labForm, toothNumber: e.target.value })}
                      placeholder="e.g., 11, 21"
                    />
                  </div>

                  <div className="appointments-field">
                    <label>Shade</label>
                    <input
                      className="appointments-input"
                      type="text"
                      value={labForm.shade}
                      onChange={(e) => setLabForm({ ...labForm, shade: e.target.value })}
                      placeholder="e.g., A2, B1"
                    />
                  </div>
                </div>
              </div>

              <div className="lab-form-section">
                <div className="lab-form-section-title">
                  <i className="fa-solid fa-notes-medical"></i> Additional Notes
                </div>

                <div className="appointments-form-grid lab-notes-grid">
                  <div className="appointments-field appointments-field-full">
                    <label>Description</label>
                    <textarea
                      className="appointments-input lab-textarea"
                      value={labForm.description}
                      onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lab-form-submit-row">
              <button className="btn-primary lab-create-btn" onClick={handleCreateLabOrder} type="button">
                <i className="fa-solid fa-plus"></i> Create Lab Order
              </button>
            </div>
          </div>

          <div className="list-panel lab-orders-list-panel">
            <h3><i className="fa-solid fa-list"></i> Lab Orders</h3>
            <div className="lab-orders-list">
              {labOrders.length === 0 ? (
                <p className="empty-state">No lab orders yet</p>
              ) : (
                <table className="lab-orders-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Work Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderDate}</td>
                        <td>{order.patientName}</td>
                        <td>{order.workType}</td>
                        <td>
                          <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                        </td>
                        <td className="lab-actions-cell">
                          <button
                            type="button"
                            className="btn-sm lab-action-btn"
                            onClick={async () => {
                              if (api.getToken()) {
                                try {
                                  await api.lab.markDelivered(order.id);
                                  showToast('Lab order marked delivered');
                                  loadData();
                                } catch (e: any) {
                                  showToast(e?.message ?? 'Failed to update lab order');
                                }
                                return;
                              }

                              const newOrders = labOrders.map((o) =>
                                o.id === order.id ? { ...o, status: 'DELIVERED' } : o
                              );
                              saveLabOrders(newOrders);
                            }}
                          >
                            Mark Delivered
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDrugs = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-pills"></i> Drug Database</h1>
        <div className="header-actions">
          <div className="search-box-inline">
            <i className="fa-solid fa-search"></i>
            <input type="text" placeholder="Search drugs..." value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="drugs-database">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Generic Name</th>
              <th>Brand Name</th>
              <th>Strength</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrugs.map(d => (
              <tr key={d.brand}>
                <td>{d.company}</td>
                <td>{d.generic}</td>
                <td><strong>{d.brand}</strong></td>
                <td>{d.strength}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSMS = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-comment-sms"></i> SMS & Messages</h1>
      </div>

      <div className="sms-panel">
        <div className="sms-stats">
          <p style={{ margin: 0, fontSize: 13, color: 'var(--neo-text-muted)', maxWidth: 520 }}>
            SMS is sent via <strong>Twilio</strong> when <code>TWILIO_*</code> is set on the server. Usage and balance appear in your Twilio console — not here.
          </p>
        </div>

        <div className="sms-templates">
          <h3>Quick Templates</h3>
          <p style={{ fontSize: 13, marginTop: -8, marginBottom: 12, color: 'var(--neo-text-muted)' }}>
            Select a patient, tap a template to fill the message (uses clinic name/phone from Settings), edit if needed, then Send.
          </p>
          <div className="template-buttons">
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('appointment')}><i className="fa-solid fa-calendar"></i> Appointment Reminder</button>
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('prescription')}><i className="fa-solid fa-prescription"></i> Prescription Ready</button>
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('lab')}><i className="fa-solid fa-flask"></i> Lab Work Ready</button>
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('payment')}><i className="fa-solid fa-credit-card"></i> Payment Reminder</button>
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('birthday')}><i className="fa-solid fa-birthday-cake"></i> Birthday Wish</button>
            <button type="button" className="template-btn" onClick={() => handleSmsTemplate('custom')}><i className="fa-solid fa-comment"></i> Custom Message</button>
          </div>
        </div>

        <div className="sms-compose">
          <h3>Send SMS</h3>
          <div className="form-group">
            <label>Select Patient</label>
            <select
              value={smsComposePatientId}
              onChange={(e) => setSmsComposePatientId(e.target.value)}
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              placeholder="Type your message..."
              rows={4}
              value={smsComposeMessage}
              onChange={(e) => setSmsComposeMessage(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={smsSending}
            onClick={() => void handleSendSmsCompose()}
          >
            <i className="fa-solid fa-paper-plane"></i> {smsSending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-cog"></i> Settings</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3><i className="fa-solid fa-hospital"></i> Clinic Details</h3>
          <div className="form-group">
            <label>Clinic Name</label>
            <input
              className="input"
              type="text"
              value={dashboardHeaderDraft.clinicName}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, clinicName: e.target.value })}
              placeholder="Your Dental Clinic"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea
              className="input"
              value={dashboardHeaderDraft.address}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, address: e.target.value })}
              placeholder="Clinic address..."
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              className="input"
              type="tel"
              value={dashboardHeaderDraft.phone}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, phone: e.target.value })}
              placeholder="Clinic phone"
            />
          </div>
          <div className="form-group">
            <label>Clinic Logo</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const res = typeof reader.result === 'string' ? reader.result : '';
                  setDashboardHeaderDraft((prev) => ({ ...prev, clinicLogo: res }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {dashboardHeaderDraft.clinicLogo ? (
              <img
                src={dashboardHeaderDraft.clinicLogo}
                alt="Clinic logo preview"
                style={{ display: 'block', marginTop: 10, maxWidth: 160, maxHeight: 80, objectFit: 'contain', border: '1px solid rgba(226,232,240,1)', borderRadius: 12, padding: 8, background: '#fff' }}
              />
            ) : null}
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              try {
                const raw = localStorage.getItem(HEADER_SETTINGS_STORAGE_KEY);
                const existing = raw ? JSON.parse(raw) : {};
                localStorage.setItem(
                  HEADER_SETTINGS_STORAGE_KEY,
                  JSON.stringify({
                    ...existing,
                    clinicName: dashboardHeaderDraft.clinicName,
                    address: dashboardHeaderDraft.address,
                    phone: dashboardHeaderDraft.phone,
                    clinicLogo: dashboardHeaderDraft.clinicLogo,
                  })
                );
                showToast('Clinic settings saved');
              } catch {
                showToast('Failed to save clinic settings');
              }
            }}
          >
            Save Changes
          </button>
        </div>

        <div className="settings-card">
          <h3><i className="fa-solid fa-user-doctor"></i> Doctor Profile</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              className="input"
              type="text"
              value={dashboardHeaderDraft.doctorName}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, doctorName: e.target.value })}
              placeholder="Doctor name"
            />
          </div>
          <div className="form-group">
            <label>Degree</label>
            <input
              className="input"
              type="text"
              value={dashboardHeaderDraft.degree}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, degree: e.target.value })}
              placeholder="BDS, MDS"
            />
          </div>
          <div className="form-group">
            <label>Specialization</label>
            <input
              className="input"
              type="text"
              value={dashboardHeaderDraft.specialization}
              onChange={(e) => setDashboardHeaderDraft({ ...dashboardHeaderDraft, specialization: e.target.value })}
              placeholder="General Dentistry"
            />
          </div>
          <div className="form-group">
            <label>Doctor Logo</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const res = typeof reader.result === 'string' ? reader.result : '';
                  setDashboardHeaderDraft((prev) => ({ ...prev, doctorLogo: res }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {dashboardHeaderDraft.doctorLogo ? (
              <img
                src={dashboardHeaderDraft.doctorLogo}
                alt="Doctor logo preview"
                style={{ display: 'block', marginTop: 10, maxWidth: 160, maxHeight: 80, objectFit: 'contain', border: '1px solid rgba(226,232,240,1)', borderRadius: 12, padding: 8, background: '#fff' }}
              />
            ) : null}
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              try {
                const raw = localStorage.getItem(HEADER_SETTINGS_STORAGE_KEY);
                const existing = raw ? JSON.parse(raw) : {};
                localStorage.setItem(
                  HEADER_SETTINGS_STORAGE_KEY,
                  JSON.stringify({
                    ...existing,
                    doctorName: dashboardHeaderDraft.doctorName,
                    qualification: dashboardHeaderDraft.degree,
                    specialization: dashboardHeaderDraft.specialization,
                    doctorLogo: dashboardHeaderDraft.doctorLogo,
                  })
                );
                showToast('Doctor profile saved');
              } catch {
                showToast('Failed to save doctor profile');
              }
            }}
          >
            Save Profile
          </button>
        </div>

        <div className="settings-card">
          <h3><i className="fa-solid fa-print"></i> Print Settings</h3>
          <div className="form-group">
            <label>Paper Size</label>
            <select
              className="input"
              value={dashboardPrintDraft.paperSize}
              onChange={(e) => setDashboardPrintDraft({ ...dashboardPrintDraft, paperSize: e.target.value as any })}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div className="form-group">
            <label>Header Height</label>
            <input
              className="input"
              type="number"
              value={dashboardPrintDraft.headerHeight}
              onChange={(e) => setDashboardPrintDraft({ ...dashboardPrintDraft, headerHeight: Number(e.target.value) })}
            />
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(
                  PRINT_SETUP_OVERRIDES_KEY,
                  JSON.stringify({
                    paperSize: dashboardPrintDraft.paperSize,
                    headerHeight: dashboardPrintDraft.headerHeight,
                  })
                );
                showToast('Print settings saved');
              } catch {
                showToast('Failed to save print settings');
              }
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );

  const handleCreateStaffUser = async () => {
    if (!newStaffForm.email.trim() || !newStaffForm.password || !newStaffForm.name.trim()) {
      showToast('Name, email, and password are required');
      return;
    }
    if (userRole === 'SUPER_ADMIN' && !newStaffForm.clinicId) {
      showToast('Select a clinic');
      return;
    }
    try {
      await api.admin.createUser({
        email: newStaffForm.email.trim(),
        password: newStaffForm.password,
        name: newStaffForm.name.trim(),
        phone: newStaffForm.phone.trim() || undefined,
        role: newStaffForm.role,
        clinicId: userRole === 'SUPER_ADMIN' ? newStaffForm.clinicId : undefined,
      });
      showToast('Team member created — they can sign in with this email and password');
      setNewStaffForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'DOCTOR',
        clinicId: userRole === 'SUPER_ADMIN' && adminClinicOptions[0] ? adminClinicOptions[0].id : '',
      });
      const res = await api.admin.users({
        search: clinicAdminSearch.trim() || undefined,
        page: clinicAdminPage,
        limit: 25,
        clinicId: userRole === 'SUPER_ADMIN' && adminFilterClinicId ? adminFilterClinicId : undefined,
      });
      setClinicAdminUsers(res.users ?? []);
      setClinicAdminTotal(res.total ?? 0);
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to create user');
    }
  };

  const handleToggleStaffActive = async (u: any) => {
    if (u.id === currentUserId) {
      showToast('You cannot change your own access here');
      return;
    }
    if (u.role === 'SUPER_ADMIN') {
      showToast('Platform admins are managed separately');
      return;
    }
    try {
      await api.admin.updateUser(u.id, { isActive: !u.isActive });
      showToast(!u.isActive ? 'Access enabled' : 'Access disabled');
      setClinicAdminUsers((list) => list.map((row) => (row.id === u.id ? { ...row, isActive: !u.isActive } : row)));
    } catch (e: any) {
      showToast(e?.message ?? 'Update failed');
    }
  };

  const handleStaffRoleChange = async (u: any, role: string) => {
    if (u.id === currentUserId) {
      showToast('You cannot change your own role here');
      return;
    }
    if (u.role === 'SUPER_ADMIN') {
      showToast('Cannot change platform admin role here');
      return;
    }
    try {
      await api.admin.updateUser(u.id, { role });
      showToast('Role updated');
      setClinicAdminUsers((list) => list.map((row) => (row.id === u.id ? { ...row, role } : row)));
    } catch (e: any) {
      showToast(e?.message ?? 'Update failed');
    }
  };

  const renderClinicAdmin = () => {
    if (!api.getToken()) {
      return (
        <div className="dashboard-content">
          <div className="page-header">
            <h1>Clinic admin</h1>
            <p>Connect to the API and sign in to manage staff access.</p>
          </div>
        </div>
      );
    }
    if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return (
        <div className="dashboard-content">
          <p>You do not have permission to open this page.</p>
        </div>
      );
    }

    const totalPages = Math.max(1, Math.ceil(clinicAdminTotal / 25));

    return (
      <div className="dashboard-content">
        <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1><i className="fa-solid fa-user-shield"></i> Clinic admin</h1>
            <p style={{ color: 'var(--neo-text-muted)', marginTop: 6, maxWidth: 720 }}>
              {userRole === 'SUPER_ADMIN'
                ? 'Create accounts, assign clinic admin or doctor roles, and disable access for any clinic.'
                : 'Manage who can sign in for your clinic. Disabled users cannot log in or call the API.'}
            </p>
          </div>
        </div>

        <div className="dashboard-card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-user-plus"></i> Add staff account</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {userRole === 'SUPER_ADMIN' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Clinic</label>
                  <select
                    className="input"
                    value={newStaffForm.clinicId}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, clinicId: e.target.value })}
                  >
                    {adminClinicOptions.length === 0 ? (
                      <option value="">Loading clinics…</option>
                    ) : (
                      adminClinicOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Full name</label>
                <input
                  className="input"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  placeholder="Dr. Name"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Email (login)</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="off"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Temporary password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Phone</label>
                <input
                  className="input"
                  value={newStaffForm.phone}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Role</label>
                <select
                  className="input"
                  value={newStaffForm.role}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, role: e.target.value as 'DOCTOR' | 'CLINIC_ADMIN' })
                  }
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="CLINIC_ADMIN">Clinic admin</option>
                </select>
              </div>
            </div>
            <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={handleCreateStaffUser}>
              <i className="fa-solid fa-plus"></i> Create account
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}><i className="fa-solid fa-users-gear"></i> Team & access</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              {userRole === 'SUPER_ADMIN' && (
                <select
                  className="input"
                  style={{ minWidth: 200 }}
                  value={adminFilterClinicId}
                  onChange={(e) => setAdminFilterClinicId(e.target.value)}
                >
                  <option value="">All clinics</option>
                  {adminClinicOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="input"
                placeholder="Search name or email…"
                value={clinicAdminSearchInput}
                onChange={(e) => setClinicAdminSearchInput(e.target.value)}
                style={{ width: 220 }}
              />
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {clinicAdminLoading ? (
              <p style={{ padding: 24, textAlign: 'center', color: 'var(--neo-text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Loading…
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Role</th>
                      {userRole === 'SUPER_ADMIN' ? (
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Clinic</th>
                      ) : null}
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Access</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicAdminUsers.map((u) => (
                      <tr key={u.id} style={{ opacity: u.isActive === false ? 0.65 : 1 }}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {u.role === 'SUPER_ADMIN' ? (
                            <span className="status-badge status-paid">Super admin</span>
                          ) : (
                            <select
                              className="input"
                              style={{ minWidth: 140, padding: '6px 8px', fontSize: 13 }}
                              value={u.role}
                              disabled={u.id === currentUserId || u.role === 'SUPER_ADMIN'}
                              onChange={(e) => handleStaffRoleChange(u, e.target.value)}
                            >
                              <option value="DOCTOR">Doctor</option>
                              <option value="CLINIC_ADMIN">Clinic admin</option>
                            </select>
                          )}
                        </td>
                        {userRole === 'SUPER_ADMIN' ? (
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--neo-text-secondary)' }}>
                            {u.clinicName || u.clinicId || '—'}
                          </td>
                        ) : null}
                        <td style={{ padding: '10px 12px' }}>
                          {u.isActive === false ? (
                            <span className="overdue-pill" style={{ background: 'rgba(185,28,28,0.12)', color: '#b91c1c' }}>
                              Disabled
                            </span>
                          ) : (
                            <span className="status-badge status-confirmed">Active</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {u.role !== 'SUPER_ADMIN' ? (
                            <button
                              type="button"
                              className={u.isActive === false ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                              disabled={u.id === currentUserId}
                              onClick={() => handleToggleStaffActive(u)}
                            >
                              {u.isActive === false ? 'Enable access' : 'Disable access'}
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clinicAdminUsers.length === 0 && !clinicAdminLoading ? (
                  <p className="empty-state" style={{ padding: 20 }}>
                    No users in this view.
                  </p>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--neo-text-muted)' }}>
                    {clinicAdminTotal} user{clinicAdminTotal === 1 ? '' : 's'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={clinicAdminPage <= 1}
                      onClick={() => setClinicAdminPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>
                      Page {clinicAdminPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={clinicAdminPage >= totalPages}
                      onClick={() => setClinicAdminPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSuperAdmin = () => {
    const tabs = [
      { id: 'overview' as const, label: 'Overview', icon: 'fa-chart-pie' },
      { id: 'approvals' as const, label: 'Pending signups', icon: 'fa-user-clock' },
      { id: 'clinics' as const, label: 'Clinics & branches', icon: 'fa-building' },
      { id: 'doctor-control' as const, label: 'Doctor control', icon: 'fa-user-doctor' },
      { id: 'patient-control' as const, label: 'Patient control', icon: 'fa-user-injured' },
      { id: 'prescription-control' as const, label: 'Prescription control', icon: 'fa-file-prescription' },
      { id: 'revenue' as const, label: 'Revenue by branch', icon: 'fa-money-bill-wave' },
      { id: 'utilization' as const, label: 'Chair utilization', icon: 'fa-chair' },
      { id: 'logs' as const, label: 'Activity logs', icon: 'fa-list' },
    ];
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1><i className="fa-solid fa-shield-halved"></i> Super Admin Panel</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Separate platform portal to manage doctors, patients, and prescriptions globally
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={superAdminTab === t.id ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setSuperAdminTab(t.id)}
            >
              <i className={`fa-solid ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>
        {superAdminLoading && superAdminTab !== 'approvals' ? (
          <div style={{ padding: 40, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin"></i> Loading...</div>
        ) : superAdminTab === 'approvals' ? (
          <div className="dashboard-card">
            <div className="card-header">
              <h3><i className="fa-solid fa-user-clock"></i> Awaiting approval</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--neo-text-muted)' }}>
                These users completed <strong>Create Account</strong> but cannot sign in until you approve.
              </p>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              {superAdminPending.length === 0 ? (
                <p className="empty-state" style={{ padding: 24 }}>No pending registrations.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name / Email</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Clinic</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Requested</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {superAdminPending.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ padding: '10px 12px' }}>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>{p.email}</div>
                            {p.phone ? <div style={{ fontSize: 12 }}>{p.phone}</div> : null}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{p.clinic?.name || p.clinicName || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13 }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              style={{ marginRight: 8 }}
                              onClick={async () => {
                                try {
                                  await api.superAdmin.approveSignup(p.id);
                                  showToast('Approved — user can sign in now');
                                  setSuperAdminPending((list) => list.filter((x) => x.id !== p.id));
                                } catch (e: any) {
                                  showToast(e?.message ?? 'Approve failed');
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={async () => {
                                if (!window.confirm(`Reject and delete registration for ${p.email}? The clinic will be removed if empty.`)) return;
                                try {
                                  await api.superAdmin.rejectSignup(p.id);
                                  showToast('Registration rejected');
                                  setSuperAdminPending((list) => list.filter((x) => x.id !== p.id));
                                } catch (e: any) {
                                  showToast(e?.message ?? 'Reject failed');
                                }
                              }}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : superAdminTab === 'overview' && superAdminStats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{superAdminStats.totalClinics ?? 0}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Clinics</div>
            </div>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{superAdminStats.totalPatients ?? 0}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Patients</div>
            </div>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{superAdminStats.totalAppointments ?? 0}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Appointments</div>
            </div>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{superAdminStats.totalPrescriptions ?? 0}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Prescriptions</div>
            </div>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>৳{Number(superAdminStats.totalRevenue ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total revenue</div>
            </div>
            <div className="stat-card" style={{ padding: 16, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{superAdminStats.activityLogCount ?? 0}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Activity logs</div>
            </div>
          </div>
        ) : superAdminTab === 'clinics' ? (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clinic / Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Patients</th>
                  <th>Appointments</th>
                  <th>Prescriptions</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {superAdminClinics.map((c: any) => (
                  <tr key={c.id}>
                    <td><strong>{c.clinicName || c.name || '—'}</strong><br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.name}</span></td>
                    <td>{c.email}</td>
                    <td>{c.role}</td>
                    <td>{c._count?.patients ?? 0}</td>
                    <td>{c._count?.appointments ?? 0}</td>
                    <td>{c._count?.prescriptions ?? 0}</td>
                    <td>{c._count?.invoices ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : superAdminTab === 'doctor-control' ? (
          <div className="dashboard-card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <h3><i className="fa-solid fa-user-doctor"></i> Doctor Management</h3>
              <input
                value={superAdminDoctorSearch}
                onChange={(e) => setSuperAdminDoctorSearch(e.target.value)}
                placeholder="Search doctor name, email, phone, clinic..."
                style={{ minWidth: 280 }}
              />
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Clinic</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Patients</th>
                    <th>Prescriptions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {superAdminDoctors.map((d: any) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.email}</div>
                        {d.phone ? <div style={{ fontSize: 12 }}>{d.phone}</div> : null}
                      </td>
                      <td>{d.clinicName || '—'}</td>
                      <td>{d.role}</td>
                      <td>{d.isActive ? 'Active' : 'Disabled'}</td>
                      <td>{d._count?.patients ?? 0}</td>
                      <td>{d._count?.prescriptions ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={async () => {
                            const name = window.prompt('Doctor name', d.name ?? '');
                            if (name === null) return;
                            const phone = window.prompt('Doctor phone', d.phone ?? '');
                            if (phone === null) return;
                            const clinicName = window.prompt('Clinic name', d.clinicName ?? '');
                            if (clinicName === null) return;
                            const roleInput = window.prompt('Role (DOCTOR or CLINIC_ADMIN)', d.role ?? 'DOCTOR');
                            if (roleInput === null) return;
                            const activeInput = window.prompt('Status (active/disabled)', d.isActive ? 'active' : 'disabled');
                            if (activeInput === null) return;
                            try {
                              const updated = await api.superAdmin.updateDoctor(d.id, {
                                name: name.trim(),
                                phone: phone.trim(),
                                clinicName: clinicName.trim(),
                                role: roleInput.trim().toUpperCase() as 'DOCTOR' | 'CLINIC_ADMIN',
                                isActive: activeInput.trim().toLowerCase() !== 'disabled',
                              });
                              setSuperAdminDoctors((list) => list.map((x: any) => (x.id === d.id ? { ...x, ...updated } : x)));
                              showToast('Doctor updated successfully');
                            } catch (e: any) {
                              showToast(e?.message ?? 'Failed to update doctor');
                            }
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {superAdminDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No doctors found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : superAdminTab === 'patient-control' ? (
          <div className="dashboard-card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <h3><i className="fa-solid fa-user-injured"></i> Patient Management</h3>
              <input
                value={superAdminPatientSearch}
                onChange={(e) => setSuperAdminPatientSearch(e.target.value)}
                placeholder="Search patient name, phone, reg no, email..."
                style={{ minWidth: 280 }}
              />
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor / Clinic</th>
                    <th>Age/Gender</th>
                    <th>Phone</th>
                    <th>Prescriptions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {superAdminPatients.map((p: any) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.regNo || '—'}</div>
                      </td>
                      <td>{p.user?.name || '—'} {p.user?.clinicName ? `(${p.user.clinicName})` : ''}</td>
                      <td>{p.age ?? '—'} / {p.gender || '—'}</td>
                      <td>{p.phone}</td>
                      <td>{p._count?.prescriptions ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={async () => {
                            const name = window.prompt('Patient name', p.name ?? '');
                            if (name === null) return;
                            const phone = window.prompt('Patient phone', p.phone ?? '');
                            if (phone === null) return;
                            const ageInput = window.prompt('Patient age', p.age?.toString() ?? '');
                            if (ageInput === null) return;
                            try {
                              const updated = await api.superAdmin.updatePatient(p.id, {
                                name: name.trim(),
                                phone: phone.trim(),
                                age: ageInput.trim() === '' ? null : Number(ageInput),
                              });
                              setSuperAdminPatients((list) => list.map((x: any) => (x.id === p.id ? { ...x, ...updated } : x)));
                              showToast('Patient updated successfully');
                            } catch (e: any) {
                              showToast(e?.message ?? 'Failed to update patient');
                            }
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {superAdminPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No patients found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : superAdminTab === 'prescription-control' ? (
          <div className="dashboard-card">
            <div className="card-header">
              <h3><i className="fa-solid fa-file-prescription"></i> Prescription Management</h3>
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Diagnosis</th>
                    <th>Advice</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {superAdminPrescriptions.map((pr: any) => (
                    <tr key={pr.id}>
                      <td>{pr.date ? new Date(pr.date).toLocaleDateString() : '—'}</td>
                      <td>{pr.patient?.name || '—'}</td>
                      <td>{pr.user?.name || '—'}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.diagnosis || '—'}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.advice || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={async () => {
                            const diagnosis = window.prompt('Diagnosis', pr.diagnosis ?? '');
                            if (diagnosis === null) return;
                            const advice = window.prompt('Advice', pr.advice ?? '');
                            if (advice === null) return;
                            const followUp = window.prompt(
                              'Follow-up date (YYYY-MM-DD, leave empty to clear)',
                              pr.followUpDate ? String(pr.followUpDate).slice(0, 10) : ''
                            );
                            if (followUp === null) return;
                            try {
                              const updated = await api.superAdmin.updatePrescription(pr.id, {
                                diagnosis,
                                advice,
                                followUpDate: followUp.trim() ? followUp.trim() : null,
                              });
                              setSuperAdminPrescriptions((list) => list.map((x: any) => (x.id === pr.id ? { ...x, ...updated } : x)));
                              showToast('Prescription updated successfully');
                            } catch (e: any) {
                              showToast(e?.message ?? 'Failed to update prescription');
                            }
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {superAdminPrescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No prescriptions found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : superAdminTab === 'revenue' ? (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch / Clinic</th>
                  <th>Contact</th>
                  <th>Revenue (paid)</th>
                  <th>Invoiced</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {superAdminRevenue.map((b: any) => (
                  <tr key={b.userId}>
                    <td><strong>{b.clinicName || b.name || '—'}</strong></td>
                    <td>{b.email}</td>
                    <td>৳{Number(b.revenue).toLocaleString()}</td>
                    <td>৳{Number(b.totalInvoiced).toLocaleString()}</td>
                    <td>{b.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : superAdminTab === 'utilization' ? (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>User</th>
                  <th>Appointments (period)</th>
                </tr>
              </thead>
              <tbody>
                {superAdminUtilization.map((u: any) => (
                  <tr key={u.userId}>
                    <td>{u.clinicName || '—'}</td>
                    <td>{u.userName}</td>
                    <td>{u.appointmentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : superAdminTab === 'logs' ? (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User / Clinic</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {superAdminLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
                    <td>{log.user?.name} {log.user?.clinicName ? `(${log.user.clinicName})` : ''}</td>
                    <td>{log.action}</td>
                    <td>{log.entity || '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard': return renderDashboard();
      case 'patients': return renderPatients();
      case 'patient-detail': return renderPatientDetail();
      case 'prescription':
        return (
          <PrescriptionPage
            embeddedInDashboard
            onBackToLogin={onLogout}
            userName={userName}
            onPrescriptionSaved={loadData}
            preselectedPatient={
              selectedPatient
                ? {
                    patientId: selectedPatient.id,
                    name: selectedPatient.name,
                    age: selectedPatient.age || '',
                    sex: selectedPatient.gender || '',
                    address: selectedPatient.address || '',
                    mobile: selectedPatient.phone,
                    regNo: selectedPatient.regNo || '',
                    date: new Date().toISOString().slice(0, 10),
                  }
                : undefined
            }
            patientsDirectory={patients.map((p) => ({
              id: p.id,
              name: p.name,
              phone: p.phone,
              regNo: p.regNo,
              age: p.age,
              gender: p.gender,
              address: p.address,
            }))}
          />
        );
      case 'prescriptions-list': return renderPrescriptionsList();
      case 'appointments': return renderAppointments();
      case 'billing': return renderBilling();
      case 'lab': return renderLab();
      case 'drugs': return renderDrugs();
      case 'sms': return renderSMS();
      case 'settings': return renderSettings();
      case 'clinic-admin': return renderClinicAdmin();
      case 'super-admin': return renderSuperAdmin();
      default: return renderDashboard();
    }
  };

  return (
    <div className="dashboard-layout">
      {renderSidebar()}
      <main className="dashboard-main" style={{ position: 'relative' }}>
        {apiError && (
          <div className="dashboard-api-error" style={{ padding: '10px 16px', background: '#fef2f2', color: '#b91c1c', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>{apiError}</span>
            <button type="button" onClick={() => { setApiError(null); loadData(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}
        {dataLoading && (
          <div className="dashboard-loading" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--primary)' }}></i>
          </div>
        )}
        {renderContent()}
      </main>
      {showNotice && (
        <div className="toast-notification">
          <i className="fa-solid fa-check-circle"></i> {showNotice}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
