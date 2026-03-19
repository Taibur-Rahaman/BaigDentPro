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

interface Props {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

const STORAGE_KEYS = {
  patients: 'baigdentpro:patients',
  prescriptions: 'baigdentpro:prescriptions',
  appointments: 'baigdentpro:appointments',
  invoices: 'baigdentpro:invoices',
  labOrders: 'baigdentpro:labOrders',
};

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
  const dateStr = d.toISOString().split('T')[0];
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
  const dateStr = d.toISOString().split('T')[0];
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
  const dateStr = d.toISOString().split('T')[0];
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    patientName: i.patient?.name ?? 'Unknown',
    total: Number(i.total ?? 0),
    paid: Number(i.paid ?? 0),
    due: Number(i.due ?? 0),
    date: dateStr,
    status: i.status ?? 'PENDING',
  };
}

function mapLabOrderFromApi(l: any): LabOrder {
  const d = l.orderDate ? new Date(l.orderDate) : new Date();
  const dateStr = d.toISOString().split('T')[0];
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
const TREATMENT_PLANS_KEY = (patientId: string) => `baigdentpro:treatmentPlans:${patientId}`;
const TREATMENT_RECORDS_KEY = (patientId: string) => `baigdentpro:treatmentRecords:${patientId}`;
const CONSENT_KEY = (patientId: string) => `baigdentpro:consent:${patientId}`;
const BILLING_PROCEDURES_KEY = 'baigdentpro:billingProcedures';

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
  'appointments' | 'billing' | 'lab' | 'drugs' | 'sms' | 'settings' | 'super-admin';

export const DashboardPage: React.FC<Props> = ({ onLogout, userName = 'Doctor', userRole }) => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotice, setShowNotice] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [superAdminStats, setSuperAdminStats] = useState<any>(null);
  const [superAdminClinics, setSuperAdminClinics] = useState<any[]>([]);
  const [superAdminRevenue, setSuperAdminRevenue] = useState<any[]>([]);
  const [superAdminUtilization, setSuperAdminUtilization] = useState<any[]>([]);
  const [superAdminLogs, setSuperAdminLogs] = useState<any[]>([]);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminTab, setSuperAdminTab] = useState<'overview' | 'clinics' | 'revenue' | 'utilization' | 'logs'>('overview');
  
  // Form states
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '', occupation: '', refBy: '' });
  const [appointmentForm, setAppointmentForm] = useState({ patientId: '', date: '', time: '', type: 'Checkup' });
  const [prescriptionForm, setPrescriptionForm] = useState({ patientId: '', diagnosis: '', advice: '', drugs: [] as DrugItem[] });
  const [invoiceForm, setInvoiceForm] = useState({ patientId: '', items: [] as { description: string; amount: number }[], discount: 0 });
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
  const [patientProfileTab, setPatientProfileTab] = useState<'info' | 'treatment' | 'ledger' | 'consent'>('info');
  const [toothNumberingSystem, setToothNumberingSystem] = useState<'fdi' | 'universal'>('fdi');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({});
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [consent, setConsent] = useState<PatientConsent | null>(null);
  
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
    } catch (e: any) {
      console.error('API load error:', e);
      setApiError(e?.message ?? 'Failed to load data');
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

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q) ||
      p.regNo?.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

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
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(a => a.date === today);
  }, [appointments]);

  const stats = useMemo(() => ({
    totalPatients: patients.length,
    todayAppointments: todayAppointments.length,
    totalPrescriptions: prescriptions.length,
    pendingInvoices: invoices.filter(i => i.status !== 'PAID').length,
    pendingLab: labOrders.filter(l => l.status !== 'DELIVERED').length,
    monthlyRevenue: invoices.reduce((sum, i) => sum + i.paid, 0),
  }), [patients, todayAppointments, prescriptions, invoices, labOrders]);

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
          items: invoiceForm.items.map((item) => ({
            description: item.description,
            quantity: 1,
            unitPrice: item.amount,
          })),
        });
        setInvoiceForm({ patientId: '', items: [], discount: 0 });
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
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
    };
    saveInvoices([newInvoice, ...invoices]);
    setInvoiceForm({ patientId: '', items: [], discount: 0 });
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

  const selectPatientForView = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientProfileTab('info');
    loadPatientMedicalHistory(patient.id);
    loadTreatmentPlans(patient.id);
    loadTreatmentRecords(patient.id);
    loadConsent(patient.id);
    setActiveNav('patient-detail');
  };

  const selectPatientForPrescription = (patient: Patient) => {
    setPrescriptionForm({ ...prescriptionForm, patientId: patient.id });
    setSelectedPatient(patient);
    setActiveNav('prescription');
  };

  const toggleTooth = (num: number) => {
    setSelectedTeeth(prev => 
      prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]
    );
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
          <h1><i className="fa-solid fa-grid-2"></i> Command Center</h1>
          <p>Welcome back, <span className="highlight">Dr. {userName}</span> — Here's your clinic overview for today.</p>
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
            <span className="stat-label">Prescriptions</span>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-icon"><i className="fa-solid fa-receipt"></i></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingInvoices}</span>
            <span className="stat-label">Pending Invoices</span>
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
            <span className="stat-value">৳{stats.monthlyRevenue.toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

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
            {patients.length === 0 ? (
              <div className="empty-state">
                <p style={{ position: 'relative', zIndex: 1 }}>No patients registered yet</p>
              </div>
            ) : (
              <div className="patient-list-mini">
                {patients.slice(0, 5).map(p => (
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
          <button className="quick-action-btn" onClick={() => setActiveNav('prescription')}>
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
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? patients.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          (p.regNo || '').toLowerCase().includes(q)
        )
      : patients;

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <h1><i className="fa-solid fa-users"></i> Patients</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search name / phone / reg no"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 280 }}
            />
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
            <div className="card-header">
              <h3><i className="fa-solid fa-list"></i> Patient List</h3>
              <div style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>{filtered.length} / {patients.length}</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: 18 }}>
                  <p style={{ position: 'relative', zIndex: 1 }}>No patients found</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Reg No</th>
                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Phone</th>
                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Age</th>
                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Gender</th>
                        <th style={{ textAlign: 'right', padding: '12px 14px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{p.regNo || '-'}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '10px 14px' }}>{p.phone}</td>
                          <td style={{ padding: '10px 14px' }}>{p.age || '-'}</td>
                          <td style={{ padding: '10px 14px' }}>{p.gender || '-'}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button className="btn-sm" onClick={() => { setSelectedPatient(p); setActiveNav('patient-detail'); }}>
                              <i className="fa-solid fa-eye"></i> View
                            </button>{' '}
                            <button className="btn-sm" onClick={() => selectPatientForPrescription(p)} style={{ marginLeft: 6 }}>
                              <i className="fa-solid fa-prescription"></i> Rx
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
                {medicalHistory.bloodPressure && <span className="history-tag">Blood Pressure</span>}
                {medicalHistory.heartProblems && <span className="history-tag">Heart Problems</span>}
                {medicalHistory.cardiacHtnMiPacemaker && <span className="history-tag">Cardiac (HTN/MI/Pacemaker)</span>}
                {medicalHistory.rheumaticFever && <span className="history-tag">Rheumatic Fever</span>}
                {medicalHistory.diabetes && <span className="history-tag">Diabetes</span>}
                {medicalHistory.asthma && <span className="history-tag">Asthma</span>}
                {medicalHistory.hepatitis && <span className="history-tag">Hepatitis</span>}
                {medicalHistory.bleedingDisorder && <span className="history-tag">Bleeding Disorder</span>}
                {medicalHistory.kidneyDiseases && <span className="history-tag">Kidney Diseases</span>}
                {medicalHistory.isPregnant && <span className="history-tag pregnant">Pregnant</span>}
                {medicalHistory.isLactating && <span className="history-tag pregnant">Lactating</span>}
                {medicalHistory.allergyPenicillin && <span className="history-tag allergy">Penicillin Allergy</span>}
                {medicalHistory.allergyLocalAnaesthesia && <span className="history-tag allergy">LA Allergy</span>}
                {medicalHistory.allergySulphur && <span className="history-tag allergy">Sulphur Allergy</span>}
                {medicalHistory.allergyAspirin && <span className="history-tag allergy">Aspirin Allergy</span>}
                {medicalHistory.takingAspirinBloodThinner && <span className="history-tag drug">Blood Thinner</span>}
                {medicalHistory.takingAntihypertensive && <span className="history-tag drug">Antihypertensive</span>}
                {medicalHistory.takingInhaler && <span className="history-tag drug">Inhaler</span>}
                {medicalHistory.habitSmoking && <span className="history-tag habit">Smoking</span>}
                {medicalHistory.habitAlcohol && <span className="history-tag habit">Alcohol</span>}
                {medicalHistory.habitBetelLeaf && <span className="history-tag habit">Betel Leaf</span>}
                {!Object.values(medicalHistory).some(v => v) && <p className="empty-state-sm">No history recorded</p>}
              </div>
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
                <img src="/dental-chart.png" alt="Dental Chart" className="dental-chart-image tertiary" />
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
                  <button className="btn-secondary btn-sm" onClick={() => setSelectedTeeth([])}>
                    <i className="fa-solid fa-times"></i> Clear Selection
                  </button>
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
                className={`profile-tab ${patientProfileTab === 'consent' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('consent')}
              >
                <i className="fa-solid fa-file-signature"></i> Consent
              </button>
            </div>

            {/* Treatment Plan Tab */}
            {patientProfileTab === 'treatment' && (
              <div className="tab-content">
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
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                  {treatmentPlans.length === 0 && (
                    <p className="empty-state">No treatment plans yet</p>
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
              <form onSubmit={handleSaveMedicalHistory} className="medical-history-form">
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
      <div className="page-header">
        <h1><i className="fa-solid fa-calendar-check"></i> Appointments</h1>
        <p><span className="highlight">Schedule Appointment</span></p>
      </div>

      <div className="appointments-page-card">
        <div className="appointments-inner-grid">
        <div className="form-panel">
          <h3><i className="fa-solid fa-calendar-plus"></i> Appointment Details</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Patient *</label>
              <select value={appointmentForm.patientId} onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })}>
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Time *</label>
              <input type="time" value={appointmentForm.time} onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Type</label>
              <select value={appointmentForm.type} onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}>
                <option value="Checkup">Checkup</option>
                <option value="Treatment">Treatment</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Emergency">Emergency</option>
                <option value="Consultation">Consultation</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" onClick={handleAddAppointment}>
            <i className="fa-solid fa-plus"></i> Schedule Appointment
          </button>
        </div>

        <div className="list-panel">
          <h3><i className="fa-solid fa-list"></i> Upcoming Appointments</h3>
          <div className="appointments-list">
            {appointments.length === 0 ? (
              <p className="empty-state">No appointments scheduled</p>
            ) : (
              appointments.map(apt => (
                <div key={apt.id} className="appointment-card">
                  <div className="apt-date-block">
                    <span className="apt-day">{new Date(apt.date).getDate()}</span>
                    <span className="apt-month">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className="apt-details">
                    <strong>{apt.patientName}</strong>
                    <span><i className="fa-solid fa-clock"></i> {apt.time}</span>
                    <span><i className="fa-solid fa-tag"></i> {apt.type}</span>
                  </div>
                  <div className="apt-actions">
                    <span className={`apt-status status-${apt.status.toLowerCase()}`}>{apt.status}</span>
                    <a
                      className="btn-icon"
                      style={{ textDecoration: 'none' }}
                      title="Add to Google Calendar"
                      href={getGoogleCalendarUrl(apt)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa-solid fa-calendar-plus"></i>
                    </a>
                    <button
                      className="btn-icon"
                      title="Download ICS (Apple Calendar / others)"
                      type="button"
                      onClick={() => downloadAppointmentIcs(apt)}
                    >
                      <span style={{ fontSize: '0.95rem' }}>ICS</span>
                    </button>
                    <button className="btn-icon" title="Send Reminder"><i className="fa-solid fa-bell"></i></button>
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
          <h3><i className="fa-solid fa-list"></i> Recent Invoices</h3>
          <div className="invoices-list">
            {invoices.length === 0 ? (
              <p className="empty-state">No invoices yet</p>
            ) : (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.invoiceNo}</td>
                      <td>{inv.patientName}</td>
                      <td>৳{inv.total}</td>
                      <td>৳{inv.paid}</td>
                      <td>৳{inv.due}</td>
                      <td><span className={`status-badge status-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
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

      <div className="lab-form-only-layout">
        <div className="form-panel lab-form-panel-full">
          <h3><i className="fa-solid fa-plus"></i> Create Lab Order</h3>

          <div className="lab-form-sections">
            <div className="lab-form-section">
              <div className="lab-form-section-title">
                <i className="fa-solid fa-clipboard-check"></i> Order Details
              </div>

              <div className="form-grid lab-order-grid">
                <div className="form-group full-width">
                  <label>Patient *</label>
                  <select value={labForm.patientId} onChange={(e) => setLabForm({ ...labForm, patientId: e.target.value })}>
                    <option value="">-- Select Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Work Type *</label>
                  <select value={labForm.workType} onChange={(e) => setLabForm({ ...labForm, workType: e.target.value })}>
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

                <div className="form-group">
                  <label>Tooth Number</label>
                  <input
                    type="text"
                    value={labForm.toothNumber}
                    onChange={(e) => setLabForm({ ...labForm, toothNumber: e.target.value })}
                    placeholder="e.g., 11, 21"
                  />
                </div>

                <div className="form-group">
                  <label>Shade</label>
                  <input
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

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={labForm.description}
                    onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lab-form-submit-row">
            <button className="btn-primary" onClick={handleCreateLabOrder}>
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
                  {labOrders.map(order => (
                    <tr key={order.id}>
                      <td>{order.orderDate}</td>
                      <td>{order.patientName}</td>
                      <td>{order.workType}</td>
                      <td><span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                      <td className="lab-actions-cell">
                        <button
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

                            const newOrders = labOrders.map(o => (o.id === order.id ? { ...o, status: 'DELIVERED' } : o));
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
          <div className="sms-stat">
            <span className="sms-stat-value">850</span>
            <span className="sms-stat-label">SMS Remaining</span>
          </div>
        </div>

        <div className="sms-templates">
          <h3>Quick Templates</h3>
          <div className="template-buttons">
            <button className="template-btn"><i className="fa-solid fa-calendar"></i> Appointment Reminder</button>
            <button className="template-btn"><i className="fa-solid fa-prescription"></i> Prescription Ready</button>
            <button className="template-btn"><i className="fa-solid fa-flask"></i> Lab Work Ready</button>
            <button className="template-btn"><i className="fa-solid fa-credit-card"></i> Payment Reminder</button>
            <button className="template-btn"><i className="fa-solid fa-birthday-cake"></i> Birthday Wish</button>
            <button className="template-btn"><i className="fa-solid fa-comment"></i> Custom Message</button>
          </div>
        </div>

        <div className="sms-compose">
          <h3>Send SMS</h3>
          <div className="form-group">
            <label>Select Patient</label>
            <select>
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea placeholder="Type your message..." rows={4} />
          </div>
          <button className="btn-primary">
            <i className="fa-solid fa-paper-plane"></i> Send SMS
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
            <input type="text" placeholder="Your Dental Clinic" />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea placeholder="Clinic address..." />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" placeholder="Clinic phone" />
          </div>
          <button className="btn-primary">Save Changes</button>
        </div>

        <div className="settings-card">
          <h3><i className="fa-solid fa-user-doctor"></i> Doctor Profile</h3>
          <div className="form-group">
            <label>Name</label>
            <input type="text" defaultValue={userName} />
          </div>
          <div className="form-group">
            <label>Degree</label>
            <input type="text" placeholder="BDS, MDS" />
          </div>
          <div className="form-group">
            <label>Specialization</label>
            <input type="text" placeholder="General Dentistry" />
          </div>
          <button className="btn-primary">Save Profile</button>
        </div>

        <div className="settings-card">
          <h3><i className="fa-solid fa-print"></i> Print Settings</h3>
          <div className="form-group">
            <label>Paper Size</label>
            <select>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div className="form-group">
            <label>Header Height</label>
            <input type="number" defaultValue={100} />
          </div>
          <button className="btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  );

  const renderSuperAdmin = () => {
    const tabs = [
      { id: 'overview' as const, label: 'Overview', icon: 'fa-chart-pie' },
      { id: 'clinics' as const, label: 'Clinics & branches', icon: 'fa-building' },
      { id: 'revenue' as const, label: 'Revenue by branch', icon: 'fa-money-bill-wave' },
      { id: 'utilization' as const, label: 'Chair utilization', icon: 'fa-chair' },
      { id: 'logs' as const, label: 'Activity logs', icon: 'fa-list' },
    ];
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1><i className="fa-solid fa-shield-halved"></i> Super Admin Panel</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Manage all clinics, view branch-wise revenue and activity logs</p>
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
        {superAdminLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin"></i> Loading...</div>
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
      case 'prescription': return <PrescriptionPage embeddedInDashboard onBackToLogin={onLogout} userName={userName} />;
      case 'prescriptions-list': return renderPrescriptionsList();
      case 'appointments': return renderAppointments();
      case 'billing': return renderBilling();
      case 'lab': return renderLab();
      case 'drugs': return renderDrugs();
      case 'sms': return renderSMS();
      case 'settings': return renderSettings();
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
