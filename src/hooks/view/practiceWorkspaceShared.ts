import type { MedHistoryVM } from '@/hooks/view/apiReturnTypes';
import type { AppointmentViewModel } from '@/viewModels';
import type { PracticeNavSection } from '@/pages/practice/practiceNav';
import { formatLocalYMD } from '@/viewModels/formatters';

export type YesNo = 'Yes' | 'No' | '';

export interface PatientRecordFormData {
  regNo: string;
  name: string;
  occupation: string;
  mobile: string;
  address: string;
  refBy: string;
  age: string;
  bloodPressureReading: string;
  femalePregnant: YesNo;
  diagnosisText: string;
  examinationNotes: string;
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
  costTotal: string;
  costPayerText: string;
  agreeToTreatment: boolean;
  explainedComplications: boolean;
  consentDate: string;
  signatureName: string;
}

export function getDefaultPatientRecordFormData(): PatientRecordFormData {
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

/** Legacy `?tab=` migration only */
export const PRACTICE_TAB_TO_NAV: Record<string, PracticeNavSection> = {
  dashboard: 'dashboard',
  patients: 'patients',
  prescriptions: 'prescription',
  'prescriptions-list': 'prescriptions-list',
  appointments: 'appointments',
  billing: 'billing',
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function parseAppointmentStartLocal(a: AppointmentViewModel): Date {
  const [yStr, mStr, dStr] = a.date.split('-');
  const [hhStr, mmStr] = (a.time || '00:00').split(':');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const hh = parseInt(hhStr ?? '0', 10);
  const mm = parseInt(mmStr ?? '0', 10);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatICSDateTimeUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function buildAppointmentIcs(a: AppointmentViewModel): string {
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

export function downloadAppointmentIcs(a: AppointmentViewModel) {
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getGoogleCalendarUrl(a: AppointmentViewModel): string {
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
  const dates = `${formatICSDateTimeUTC(start)}/${formatICSDateTimeUTC(end)}`;
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', text);
  url.searchParams.set('details', details);
  url.searchParams.set('dates', dates);
  url.searchParams.set('sprop', '');
  url.searchParams.set('sf', 'true');
  return url.toString();
}

export { formatLocalYMD };

/** Patient profile card: all checkbox flags in the same order as the Medical History modal. */
export const MEDICAL_HISTORY_DISPLAY_ORDER: ReadonlyArray<{
  key: keyof MedHistoryVM;
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

export const MEDICAL_HISTORY_TEXT_DISPLAY: ReadonlyArray<{ key: keyof MedHistoryVM; title: string }> = [
  { key: 'otherDiseases', title: 'Other diseases' },
  { key: 'allergyOther', title: 'Other allergies' },
  { key: 'takingOther', title: 'Other medications' },
  { key: 'habitOther', title: 'Other habits' },
  { key: 'details', title: 'Additional details' },
];

export function hasDisplayedMedicalHistory(mh: MedHistoryVM): boolean {
  const anyFlag = MEDICAL_HISTORY_DISPLAY_ORDER.some(({ key }) => Boolean(mh[key]));
  const anyText = MEDICAL_HISTORY_TEXT_DISPLAY.some(({ key }) => {
    const v = mh[key];
    return typeof v === 'string' && v.trim().length > 0;
  });
  return anyFlag || anyText;
}

export const DIAGNOSIS_OPTIONS = [
  'Examination',
  'X-Ray/RVG',
  'Calculus',
  'Caries',
  'Deep Caries',
  'BDR/BDC/Fracture',
  'Missing',
  'Mobility',
  'Mucosal Lesion',
];

export const TREATMENT_OPTIONS = [
  'Consultation',
  'Scaling',
  'Filling',
  'Root Canal',
  'Extraction/Surgical Ext',
  'Partial/Complete Denture/Implant',
  'Implant',
  'Fixed Orthodontics',
];

export const DRUG_DATABASE = [
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

export const DEFAULT_DENTAL_PROCEDURES = [
  'Consultation',
  'Scaling & Polishing',
  'Filling (Composite)',
  'Filling (Amalgam)',
  'Root Canal Treatment',
  'Extraction',
  'Surgical Extraction',
  'Crown',
  'Bridge',
  'Denture (Complete)',
  'Denture (Partial)',
  'Implant',
  'Teeth Whitening',
  'Orthodontic Consultation',
  'Braces Fitting',
  'Retainer',
  'Night Guard',
  'X-Ray (IOPA)',
  'X-Ray (OPG)',
  'Fluoride Treatment',
  'Sealant Application',
];

export const TOOTH_CHART_FDI = {
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

export const TOOTH_CHART_UNIVERSAL = {
  permanent: [
    { quadrant: 'Upper Right', numbers: [1, 2, 3, 4, 5, 6, 7, 8] },
    { quadrant: 'Upper Left', numbers: [9, 10, 11, 12, 13, 14, 15, 16] },
    { quadrant: 'Lower Right', numbers: [32, 31, 30, 29, 28, 27, 26, 25] },
    { quadrant: 'Lower Left', numbers: [24, 23, 22, 21, 20, 19, 18, 17] },
  ],
};
