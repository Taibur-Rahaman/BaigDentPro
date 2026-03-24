import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from './api';

export interface DrugRow {
  id: string;
  brand: string;
  dose: string;
  duration: string;
  durationUnit: 'D' | 'M';
  beforeFood: boolean;
  afterFood: boolean;
}

interface Props {
  onBackToLogin: () => void;
  userName?: string;
  /** When true, only the Create Prescription form is rendered (no nav, no app shell). Use inside Dashboard. */
  embeddedInDashboard?: boolean;
  preselectedPatient?: {
    /** When set (e.g. from Dashboard patient profile), prescriptions can sync to the API. */
    patientId?: string;
    name: string;
    age: string;
    sex: string;
    address: string;
    mobile: string;
    regNo: string;
    date?: string;
  };
  /** When embedded in Dashboard: clinic patients for linking server saves. */
  patientsDirectory?: Array<{
    id: string;
    name: string;
    phone: string;
    regNo?: string;
    age?: string;
    gender?: string;
    address?: string;
  }>;
  /** Called after a successful server sync (e.g. refresh prescription list). */
  onPrescriptionSaved?: () => void;
}

const createDrugRow = (): DrugRow => ({
  id: crypto.randomUUID(),
  brand: '',
  dose: '',
  duration: '',
  durationUnit: 'D',
  beforeFood: false,
  afterFood: false,
});

// Comprehensive Drug Database
const DRUG_DATABASE = [
  { company: 'GSK', generic: 'Amoxicillin', brand: 'Amoxil', strength: '250mg, 500mg' },
  { company: 'GSK', generic: 'Amoxicillin', brand: 'Moxatag', strength: '500mg' },
  { company: 'Pfizer', generic: 'Azithromycin', brand: 'Zithromax', strength: '250mg, 500mg' },
  { company: 'Abbott', generic: 'Metronidazole', brand: 'Flagyl', strength: '200mg, 400mg' },
  { company: 'Sun', generic: 'Ibuprofen', brand: 'Brufen', strength: '200mg, 400mg, 600mg' },
  { company: 'Cipla', generic: 'Paracetamol', brand: 'Crocin', strength: '500mg, 650mg' },
  { company: 'Cipla', generic: 'Paracetamol', brand: 'Calpol', strength: '250mg' },
  { company: 'Mankind', generic: 'Omeprazole', brand: 'Omez', strength: '20mg' },
  { company: 'Mankind', generic: 'Pantoprazole', brand: 'Pan', strength: '40mg' },
  { company: 'Lupin', generic: 'Cefixime', brand: 'Taxim', strength: '200mg, 400mg' },
  { company: 'Alkem', generic: 'Cefuroxime', brand: 'Zinacef', strength: '250mg, 500mg' },
  { company: 'GSK', generic: 'Amlodipine', brand: 'Amlovas', strength: '2.5mg, 5mg, 10mg' },
  { company: 'USV', generic: 'Metformin', brand: 'Glycomet', strength: '500mg, 850mg, 1000mg' },
  { company: 'USV', generic: 'Glimepiride', brand: 'Glucovas', strength: '1mg, 2mg, 4mg' },
  { company: 'Lupin', generic: 'Levofloxacin', brand: 'Levaquin', strength: '250mg, 500mg' },
  { company: 'Dr Reddy', generic: 'Ofloxacin', brand: 'Oflox', strength: '200mg, 400mg' },
  { company: 'Novartis', generic: 'Cetirizine', brand: 'Cetrizet', strength: '5mg, 10mg' },
  { company: 'Mankind', generic: 'Cetirizine', brand: 'Allercet', strength: '5mg, 10mg' },
  { company: 'GSK', generic: 'Ranitidine', brand: 'Zantac', strength: '150mg, 300mg' },
  { company: 'Alkem', generic: 'Domperidone', brand: 'Domstal', strength: '10mg' },
  { company: 'Cipla', generic: 'Aceclofenac', brand: 'Hifenac', strength: '100mg' },
  { company: 'Sun', generic: 'Nimesulide', brand: 'Nicip', strength: '100mg' },
  { company: 'Abbott', generic: 'Albendazole', brand: 'Albenza', strength: '400mg' },
  { company: 'Cipla', generic: 'Mebendazole', brand: 'Mebendaz', strength: '100mg' },
  { company: 'GSK', generic: 'Diclofenac', brand: 'Cataflam', strength: '25mg, 50mg' },
  { company: 'Zydus', generic: 'Atorvastatin', brand: 'Atorva', strength: '10mg, 20mg, 40mg' },
  { company: 'Lupin', generic: 'Losartan', brand: 'Losacar', strength: '25mg, 50mg' },
  { company: 'Mankind', generic: 'Telmisartan', brand: 'Telma', strength: '20mg, 40mg, 80mg' },
  { company: 'Cipla', generic: 'Montelukast', brand: 'Montair', strength: '4mg, 5mg, 10mg' },
  { company: 'Dr Reddy', generic: 'Ferrous Sulfate', brand: 'Ferra', strength: '325mg' },
];

// Template dropdowns
const TEMPLATE_DROPDOWN = [
  { label: 'Drug Template', icon: 'fa-pills', action: 'drug' },
  { label: 'Treatment Template', icon: 'fa-user-md', action: 'treatment' },
  { label: 'Advice Template', icon: 'fa-comment-medical', action: 'advice' },
  { label: 'C/C Template', icon: 'fa-comment', action: 'cc' },
  { label: 'O/E Template', icon: 'fa-stethoscope', action: 'oe' },
  { label: 'I/X Template', icon: 'fa-flask', action: 'ix' },
  { label: 'Dose Template', icon: 'fa-syringe', action: 'dose' },
  { label: 'Duration Template', icon: 'fa-clock', action: 'duration' },
  { label: 'Examination Notes', icon: 'fa-note-sticky', action: 'exam' },
] as const;

const PAGE_SETUP_DROPDOWN = [
  { label: 'Page Setup', icon: 'fa-ruler-combined', action: 'pageSetup' },
  { label: 'Page Option', icon: 'fa-sliders', action: 'pageOption' },
  { label: 'Settings', icon: 'fa-gear', action: 'settings' },
  { label: 'Print Preview', icon: 'fa-eye', action: 'printPreview' },
] as const;

const SMS_DROPDOWN = [
  { label: 'Send Appointment SMS', icon: 'fa-calendar', action: 'apptSms' },
  { label: 'Send Prescription SMS', icon: 'fa-prescription', action: 'rxSms' },
  { label: 'Send Reminder SMS', icon: 'fa-bell', action: 'reminderSms' },
  { label: 'Custom SMS', icon: 'fa-sms', action: 'customSms' },
  { label: 'SMS Templates', icon: 'fa-list', action: 'smsTemplates' },
  { label: 'SMS History', icon: 'fa-history', action: 'smsHistory' },
] as const;

const ACCOUNT_DROPDOWN = [
  { label: 'Profile Settings', icon: 'fa-user-cog', action: 'profile' },
  { label: 'Change Password', icon: 'fa-key', action: 'password' },
  { label: 'Clinic Settings', icon: 'fa-hospital', action: 'clinic' },
  { label: 'Watch Tutorial', icon: 'fa-video', action: 'tutorial' },
  { label: 'About BaigDentPro', icon: 'fa-info-circle', action: 'about' },
  { label: 'Log Out', icon: 'fa-sign-out-alt', action: 'logout' },
] as const;

const TEMPLATE_SEARCH_ITEMS = [
  { key: 'drug', label: 'Drug Template', icon: 'fa-pills' },
  { key: 'generic', label: 'Generic to Brand', icon: 'fa-exchange-alt' },
  { key: 'treatment', label: 'Treatment Template', icon: 'fa-user-md' },
  { key: 'advice', label: 'Advice Template', icon: 'fa-comment-medical' },
  { key: 'cc', label: 'C/C Template', icon: 'fa-comment' },
  { key: 'oe', label: 'O/E Template', icon: 'fa-stethoscope' },
  { key: 'ix', label: 'I/X Template', icon: 'fa-flask' },
] as const;

type PrescriptionSubView = 
  | 'prescription' 
  | 'viewall' 
  | 'drugdb' 
  | 'appointment' 
  | 'payment' 
  | 'header-edit' 
  | 'page-setup' 
  | 'sms' 
  | 'buy-credit' 
  | 'offline' 
  | 'account'
  | 'lab-reports'
  | 'inventory'
  | 'settings'
  | 'dashboard';

export const PrescriptionPage: React.FC<Props> = ({
  onBackToLogin,
  userName = 'User',
  embeddedInDashboard = false,
  preselectedPatient,
  patientsDirectory,
  onPrescriptionSaved,
}) => {
  const [activeNav, setActiveNav] = useState<PrescriptionSubView>('prescription');
  const [notice, setNotice] = useState<string | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Patient state
  const [patient, setPatient] = useState({
    name: '',
    age: '',
    sex: '',
    address: '',
    mobile: '',
    regNo: '',
    date: new Date().toISOString().slice(0, 10),
  });

  /** Linked clinic patient id for API `prescriptions.create` (Dashboard / patient picker). */
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(() => preselectedPatient?.patientId ?? null);
  const [savingPrescription, setSavingPrescription] = useState(false);

  // Auto-fill patient fields when Dashboard opens this page from a patient profile.
  useEffect(() => {
    if (preselectedPatient) {
      setLinkedPatientId(preselectedPatient.patientId ?? null);
      setPatient((p) => ({
        ...p,
        name: preselectedPatient.name ?? '',
        age: preselectedPatient.age ?? '',
        sex: preselectedPatient.sex ?? '',
        address: preselectedPatient.address ?? '',
        mobile: preselectedPatient.mobile ?? '',
        regNo: preselectedPatient.regNo ?? '',
        date: preselectedPatient.date ?? p.date,
      }));
      setShowPatientSearch(false);

      // Load the last saved Prescription "History" for this patient (localStorage demo feature).
      // This powers the "Past History / Present History / Notes" textareas.
      try {
        const raw = localStorage.getItem('baigdentpro:prescriptions');
        const list: Array<any> = raw ? JSON.parse(raw) : [];

        const regNo = preselectedPatient.regNo?.toString().trim() ?? '';
        const name = preselectedPatient.name?.toString().trim().toLowerCase() ?? '';

        const candidates = list.filter((item) => {
          const itemPatient = item?.patient ?? {};
          const itemRegNo = itemPatient?.regNo?.toString().trim() ?? '';
          const itemName = itemPatient?.name?.toString().trim().toLowerCase() ?? '';
          if (regNo) return itemRegNo === regNo;
          if (name) return itemName === name;
          return false;
        });

        const latest = candidates.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0))[0];
        if (latest) {
          setPastHistory(typeof latest.pastHistory === 'string' ? (latest.pastHistory || 'Past medical history') : 'Past medical history');
          setPresentHistory(typeof latest.presentHistory === 'string' ? latest.presentHistory : '');
          setNotesHistory(typeof latest.notesHistory === 'string' ? latest.notesHistory : '');
        }
      } catch {
        // ignore localStorage parsing errors
      }
      return;
    }

    // If no preselected patient is provided, reset patient fields.
    setLinkedPatientId(null);
    setPatient({
      name: '',
      age: '',
      sex: '',
      address: '',
      mobile: '',
      regNo: '',
      date: new Date().toISOString().slice(0, 10),
    });

    setPastHistory('Past medical history');
    setPresentHistory('');
    setNotesHistory('');
  }, [preselectedPatient]);
  
  // Clinical data
  const [dx, setDx] = useState('');
  const [cc, setCc] = useState('');
  const [oeMode, setOeMode] = useState<'oe' | 'oeBox' | 'boxOe'>('oeBox');
  const [oeText, setOeText] = useState('');
  const [oe, setOe] = useState({
    bp: '',
    pulse: '',
    temp: '',
    heart: 'S1+S2+M0',
    lungs: 'NAD',
    abd: 'Soft, Non-Tender',
    anaemia: '',
    jaundice: '',
    cyanosis: '',
    oedema: '',
  });
  const [ix, setIx] = useState('');
  const [drugHistory, setDrugHistory] = useState('');
  const [typeBrand, setTypeBrand] = useState('');
  
  // Calculator tabs
  const [calcTab, setCalcTab] = useState<'bmi' | 'insulin' | 'zscore' | 'bmr' | 'edd'>('bmi');
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInch, setHeightInch] = useState('');
  const [bmiValue, setBmiValue] = useState<string>('');
  const [idealWeight, setIdealWeight] = useState('');
  const [classVal, setClassVal] = useState('');
  
  // Insulin calculator
  const [insulin, setInsulin] = useState({ weight: '', unitKg: '0.3', time: '2', totalUnit: '', dose: '' });
  
  // Z-Score calculator
  const [zscore, setZscore] = useState({ dob: '', gender: 'Male' as 'Male' | 'Female', weight: '', result: '', ageDays: '' });
  
  // BMR calculator
  const [bmr, setBmr] = useState({ weight: '', height: '', inch: '', gender: 'Male' as 'Male' | 'Female', age: '', activity: '1.2', bmrVal: '', calorieNeed: '' });
  
  // EDD calculator
  const [edd, setEdd] = useState({ lmp: '', gestAge: '', edd: '' });
  
  // History tabs
  const [historyTab, setHistoryTab] = useState<'past' | 'present' | 'notes'>('past');
  const [pastHistory, setPastHistory] = useState('Past medical history');
  const [presentHistory, setPresentHistory] = useState('');
  const [notesHistory, setNotesHistory] = useState('');
  
  // Drugs
  const [drugs, setDrugs] = useState<DrugRow[]>([createDrugRow()]);
  const [rxBrand, setRxBrand] = useState('');
  const [rxDose, setRxDose] = useState('');
  const [rxDuration, setRxDuration] = useState('');
  const [rxDurationUnit, setRxDurationUnit] = useState<'D' | 'M'>('D');
  const [rxBeforeFood, setRxBeforeFood] = useState(false);
  const [rxAfterFood, setRxAfterFood] = useState(false);
  
  // Visit info
  const [visit, setVisit] = useState({
    paid: '300',
    visitNo: '1',
    lastVisit: '0 days ago',
    nextVisitDays: '0',
  });
  const [followUpDay, setFollowUpDay] = useState('');
  const [revisitUnit, setRevisitUnit] = useState<'' | 'দিন' | 'মাস'>('');
  const [status, setStatus] = useState('');
  
  // Filter & templates
  const [filter, setFilter] = useState({ company: '', generic: '', brand: '' });
  const [oeBoxVisible, setOeBoxVisible] = useState(true);
  const [printPast, setPrintPast] = useState(false);
  const [printPresent, setPrintPresent] = useState(false);
  const [printNotes, setPrintNotes] = useState(false);
  const [printEdd, setPrintEdd] = useState(false);
  const [templateSearch, setTemplateSearch] = useState<Record<string, string>>({});
  const [drugInfoCnt, setDrugInfoCnt] = useState('');
  const richTextRef = useRef<HTMLDivElement>(null);
  
  // Drug Database Search
  const [drugDbSearch, setDrugDbSearch] = useState({ company: '', generic: '', brand: '' });
  const [drugDbResults, setDrugDbResults] = useState<typeof DRUG_DATABASE>([]);
  
  // Header Edit
  const [headerSettings, setHeaderSettings] = useState({
    doctorName: 'Dr. Muhammad Ali',
    qualification: 'BDS, MDS',
    specialization: '',
    department: '',
    college: '',
    bmdcRegNo: '',
    clinicName: 'BaigDentPro Dental Care',
    clinicLogo: '',
    address: '123 Medical Center, Main Road',
    phone: '+880 1617-180711',
    email: 'contact@baigdentpro.com',
    visitTime: '',
    dayOff: '',
    doctorLogo: '',
  });

  const HEADER_SETTINGS_STORAGE_KEY = 'baigdentpro:headerSettings';
  const PRINT_SETUP_OVERRIDES_STORAGE_KEY = 'baigdentpro:printSetupOverrides';

  useEffect(() => {
    // Load persisted clinic/doctor header settings (so Settings page affects all pages).
    try {
      const raw = localStorage.getItem(HEADER_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<typeof headerSettings>;
      setHeaderSettings((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type PrintBarcodePosition = 'leftBottom' | 'rightTop';
  type PrintSetupState = {
    footerText: string;
    fontSizePt: number;
    linePerPage: number;
    visitFees: number;
    revisitFees: number;
    revisitValidityDays: number;
    defaultRevisitText: string;
    printBarcode: boolean;
    barcodePosition: PrintBarcodePosition;
    multipage: boolean;
    displayVisitNo: boolean;
    printPatientInfo: boolean;
    displayRxTitle: boolean;
    showName: boolean;
    showAge: boolean;
    showSex: boolean;
    showWeight: boolean;
    showDate: boolean;
    showAddress: boolean;
    showRegNo: boolean;
    showMobile: boolean;
    showCC: boolean;
    showOE: boolean;
    showAdvice: boolean;
    showDx: boolean;
    showFooter: boolean;
    defaultPastPrint: boolean;
    defaultPresentPrint: boolean;
    defaultNotesPrint: boolean;
    defaultEddPrint: boolean;
    // Page size controls (cm)
    headerHeightCm: number;
    headerWidthCm: number;
    patientInfoHeightCm: number;
    patientInfoWidthCm: number;
    leftHeightCm: number;
    leftWidthCm: number;
    rightHeightCm: number;
    rightWidthCm: number;
    footerHeightCm: number;
    footerWidthCm: number;
    pageHeightCm: number;
    pageWidthCm: number;
  };

  const PRINT_SETUP_STORAGE_KEY = 'baigdentpro:printSetup';
  const defaultPrintSetup: PrintSetupState = {
    footerText: 'নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।',
    fontSizePt: 12,
    linePerPage: 32,
    visitFees: 300,
    revisitFees: 200,
    revisitValidityDays: 90,
    defaultRevisitText: '',
    printBarcode: true,
    barcodePosition: 'leftBottom',
    multipage: true,
    displayVisitNo: true,
    printPatientInfo: true,
    displayRxTitle: true,
    showName: true,
    showAge: true,
    showSex: true,
    showWeight: true,
    showDate: true,
    showAddress: true,
    showRegNo: true,
    showMobile: true,
    showCC: true,
    showOE: true,
    showAdvice: true,
    showDx: true,
    showFooter: true,
    defaultPastPrint: false,
    defaultPresentPrint: false,
    defaultNotesPrint: false,
    defaultEddPrint: false,
    headerHeightCm: 5.7,
    headerWidthCm: 21.1,
    patientInfoHeightCm: 1.6,
    patientInfoWidthCm: 21.1,
    leftHeightCm: 19,
    leftWidthCm: 7.6,
    rightHeightCm: 19,
    rightWidthCm: 13.3,
    footerHeightCm: 1,
    footerWidthCm: 21.1,
    pageHeightCm: 29.6,
    pageWidthCm: 21.3,
  };

  const [printSetupTab, setPrintSetupTab] = useState<'pageSetup' | 'pageOption' | 'settings'>('pageSetup');
  const [printSetup, setPrintSetup] = useState<PrintSetupState>(defaultPrintSetup);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRINT_SETUP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PrintSetupState>;
      setPrintSetup((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Apply dashboard overrides (paper size / optional header height) on top of saved print setup.
    try {
      const raw = localStorage.getItem(PRINT_SETUP_OVERRIDES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ paperSize: 'A4' | 'A5' | 'Letter'; headerHeight: number }>;

      const paper = parsed.paperSize;
      const size = paper === 'A5'
        ? { widthCm: 14.8, heightCm: 21.0 }
        : paper === 'Letter'
          ? { widthCm: 21.59, heightCm: 27.94 }
          : { widthCm: 21.0, heightCm: 29.7 }; // A4 default

      const next: Partial<PrintSetupState> = {
        pageWidthCm: size.widthCm,
        pageHeightCm: size.heightCm,
      };

      if (typeof parsed.headerHeight === 'number' && isFinite(parsed.headerHeight)) {
        // Interpret values > 20 as mm; otherwise treat as cm.
        const maybeCm = parsed.headerHeight > 20 ? parsed.headerHeight / 10 : parsed.headerHeight;
        if (maybeCm > 0.5 && maybeCm < 20) next.headerHeightCm = maybeCm;
      }

      setPrintSetup((prev) => ({ ...prev, ...next }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Keep visit fees aligned with configured defaults (don’t overwrite user edits if they already changed it).
    setVisit((v) => (v.paid === '300' ? { ...v, paid: String(printSetup.visitFees) } : v));
  }, [printSetup.visitFees]);

  useEffect(() => {
    // Sync checkbox defaults like ZilSoft (only when first loaded and still false).
    if (!printPast && printSetup.defaultPastPrint) setPrintPast(true);
    if (!printPresent && printSetup.defaultPresentPrint) setPrintPresent(true);
    if (!printNotes && printSetup.defaultNotesPrint) setPrintNotes(true);
    if (!printEdd && printSetup.defaultEddPrint) setPrintEdd(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printSetup.defaultPastPrint, printSetup.defaultPresentPrint, printSetup.defaultNotesPrint, printSetup.defaultEddPrint]);

  const getOeDisplayString = useCallback((): string => {
    if (oeMode === 'oe' && oeText.trim()) return oeText.trim();
    const parts = (['bp', 'pulse', 'temp', 'heart', 'lungs', 'abd', 'anaemia', 'jaundice', 'cyanosis', 'oedema'] as const)
      .map((k) => {
        const label = k === 'abd' ? 'Abd' : k.charAt(0).toUpperCase() + k.slice(1);
        const val = (oe as Record<string, string>)[k];
        return val ? `${label}: ${val}` : null;
      })
      .filter(Boolean);
    return parts.join('\n');
  }, [oeMode, oeText, oe]);

  const transferBoxToOe = useCallback(() => {
    const lines = (['bp', 'pulse', 'temp', 'heart', 'lungs', 'abd', 'anaemia', 'jaundice', 'cyanosis', 'oedema'] as const)
      .map((k) => {
        const label = k === 'abd' ? 'Abd' : k.charAt(0).toUpperCase() + k.slice(1);
        const val = (oe as Record<string, string>)[k];
        return val ? `${label}: ${val}` : null;
      })
      .filter(Boolean);
    setOeText(lines.join('\n'));
    setOeMode('oe');
  }, [oe]);

  const computeBmi = useCallback(() => {
    const w = parseFloat(weight);
    const f = parseFloat(heightFeet) || 0;
    const i = parseFloat(heightInch) || 0;
    if (w > 0 && (f > 0 || i > 0)) {
      const heightM = (f * 12 + i) * 0.0254;
      const b = w / (heightM * heightM);
      setBmiValue(b.toFixed(1));
      if (b < 18.5) setClassVal('Underweight');
      else if (b < 25) setClassVal('Normal');
      else if (b < 30) setClassVal('Overweight');
      else if (b < 35) setClassVal('Obesity Class-I');
      else if (b < 40) setClassVal('Obesity Class-II');
      else setClassVal('Obesity Class-III');
      setIdealWeight((heightM * heightM * 23).toFixed(1) + ' kg');
    } else {
      setBmiValue('');
      setClassVal('');
      setIdealWeight('');
    }
  }, [weight, heightFeet, heightInch]);

  const handleAddDrugFromRx = () => {
    if (!rxBrand.trim() && !rxDose.trim() && !rxDuration.trim()) return;
    const hasMonth = /মাস/.test(rxDuration);
    const unit: 'D' | 'M' = hasMonth ? 'M' : rxDurationUnit;
    setDrugs((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        brand: rxBrand,
        dose: rxDose,
        duration: rxDuration,
        durationUnit: unit,
        beforeFood: rxBeforeFood,
        afterFood: rxAfterFood,
      },
    ]);
    setRxBrand('');
    setRxDose('');
    setRxDuration('');
  };

  const handleSave = async (): Promise<boolean> => {
    const validDrugs = drugs.filter((d) => d.brand.trim() && d.dose.trim());
    if (validDrugs.length === 0) {
      showNotice('Add at least one drug with brand and dose.');
      return false;
    }
    if (!patient.name.trim() && !patient.mobile.trim()) {
      showNotice('Enter patient name or mobile.');
      return false;
    }

    const revisitStr = [followUpDay.trim(), revisitUnit].filter(Boolean).join(' ');
    const payload = {
      patient,
      dx,
      cc,
      oe: getOeDisplayString(),
      oeBox: oe,
      ix,
      drugHistory,
      pastHistory,
      presentHistory,
      notesHistory,
      drugs,
      visit,
      revisit: revisitStr,
      richText: richTextRef.current?.innerHTML ?? '',
      createdAt: Date.now(),
    };
    const existingRaw = localStorage.getItem('baigdentpro:prescriptions');
    const list = existingRaw ? JSON.parse(existingRaw) : [];
    list.push(payload);
    localStorage.setItem('baigdentpro:prescriptions', JSON.stringify(list));

    setSavingPrescription(true);
    try {
      let extra = '';
      const pid = linkedPatientId || preselectedPatient?.patientId;
      if (api.getToken() && pid) {
        try {
          const richHtml = richTextRef.current?.innerHTML ?? '';
          await api.prescriptions.create({
            patientId: pid,
            diagnosis: dx || '',
            chiefComplaint: cc || '',
            examination: getOeDisplayString() || '',
            investigation: ix || '',
            advice: richHtml || undefined,
            vitals: JSON.stringify(oe),
            items: validDrugs.map((d) => ({
              drugName: d.brand,
              genericName: '',
              dosage: d.dose,
              frequency: d.durationUnit === 'M' ? `${d.duration} M` : `${d.duration} D`,
              duration: d.durationUnit === 'M' ? `${d.duration} months` : `${d.duration} days`,
              beforeFood: d.beforeFood,
              afterFood: d.afterFood,
            })),
          });
          extra = ' Synced to server.';
          onPrescriptionSaved?.();
        } catch (e: any) {
          showNotice(e?.message ?? 'Server save failed — saved locally only.');
          setStatus('Saved locally');
          return true;
        }
      } else if (api.getToken() && !pid) {
        extra = ' Saved locally — select a clinic patient to sync to the server.';
      }

      setStatus('Saved');
      showNotice(`Prescription saved successfully!${extra}`);
      return true;
    } finally {
      setSavingPrescription(false);
    }
  };

  const getPrintHtml = useCallback((opts: { forPrint?: boolean; withoutHeader?: boolean }) => {
    const revisitStr = [followUpDay.trim(), revisitUnit].filter(Boolean).join(' ');
    const oeDisplay = getOeDisplayString().replace(/\n/g, '<br>');
    const richHtml = richTextRef.current?.innerHTML ?? '';
    const doc = headerSettings.doctorName || 'Doctor';
    const qual = headerSettings.qualification || '';
    const spec = headerSettings.specialization || '';
    const dept = headerSettings.department || '';
    const college = headerSettings.college || '';
    const bmdc = headerSettings.bmdcRegNo || '';
    const clinic = headerSettings.clinicName || '';
    const clinicLogo = headerSettings.clinicLogo || '';
    const addr = headerSettings.address || '';
    const ph = headerSettings.phone || '';
    const visitTime = headerSettings.visitTime || '';
    const dayOff = headerSettings.dayOff || '';
    const doctorLogo = headerSettings.doctorLogo || '';
    const wt = weight ? `${weight} kg` : '—';
    const bmiStr = bmiValue ? `BMI: ${bmiValue}` : '';
    const regNo = (patient.regNo || visit.visitNo || '').toString().replace(/\s/g, '');
    const barcodeData = encodeURIComponent(regNo || '0');
    const barcodeDigits = (regNo || '—').split('').join(' ');
    const withoutHeader = Boolean(opts.withoutHeader);
    const fontSizePt = printSetup.fontSizePt || 12;
    const footerText = printSetup.footerText || defaultPrintSetup.footerText;
    const showFooter = printSetup.showFooter;

    const escapeHtmlAttr = (value: string) =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const clinicLogoAttr = clinicLogo ? escapeHtmlAttr(clinicLogo) : '';
    const doctorLogoAttr = doctorLogo ? escapeHtmlAttr(doctorLogo) : '';
    const drugsList = drugs
      .filter((r) => r.brand || r.dose || r.duration)
      .map((r) => {
        const foodBn = r.beforeFood ? '(আহারের ১ ঘন্টা আগে)' : r.afterFood ? '(খাবার পর)' : '';
        const durBn = r.durationUnit === 'M' ? `${r.duration} মাস` : `${r.duration} দিন`;
        const line2 = [foodBn, durBn].filter(Boolean).join(' - ');
        return `<div class="rx-item"><span class="rx-line1">${(r.brand || '').replace(/</g, '&lt;')} ${(r.dose || '').replace(/</g, '&lt;')}</span><br><span class="rx-line2">${line2.replace(/</g, '&lt;')}</span></div>`;
      })
      .join('');
    const patientFields: string[] = [];
    if (printSetup.showName) patientFields.push(`<span>Name : ${(patient.name || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showAge) patientFields.push(`<span>Age : ${(patient.age || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showSex) patientFields.push(`<span>Sex : ${(patient.sex || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showDate) patientFields.push(`<span>Date : ${(patient.date || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showAddress) patientFields.push(`<span>Address : ${(patient.address || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showRegNo) patientFields.push(`<span>Reg. No : ${(patient.regNo || '—').replace(/</g, '&lt;')}</span>`);
    if (printSetup.showWeight) patientFields.push(`<span>Wt. : ${wt.replace(/</g, '&lt;')}</span>`);
    if (printSetup.showMobile) patientFields.push(`<span>Mobile : ${(patient.mobile || '—').replace(/</g, '&lt;')}</span>`);

    const shouldPrintPast = printPast;
    const shouldPrintPresent = printPresent;
    const shouldPrintNotes = printNotes;
    const shouldPrintEdd = printEdd;

    const showBarcode = printSetup.printBarcode;
    const barcodeRightTop = printSetup.barcodePosition === 'rightTop';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Prescription</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;}
  @page{size: ${printSetup.pageWidthCm}cm ${printSetup.pageHeightCm}cm; margin: 0;}
  body{font-family:'Noto Sans Bengali', Arial, sans-serif;font-size:${fontSizePt}pt;line-height:1.45;color:#000;background:#fff;margin:0;padding:0;}
  .page{width:${printSetup.pageWidthCm}cm;min-height:${printSetup.pageHeightCm}cm;margin:0 auto;padding:0.4cm;display:flex;flex-direction:column;}
  .print-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;min-height:${printSetup.headerHeightCm}cm;${withoutHeader ? 'display:none;' : ''}}
  .print-header-left{text-align:left;font-size:13px;}
  .print-header-right{text-align:right;font-size:13px;}
  .print-logo{display:block;max-height:1.1cm;max-width:3.2cm;object-fit:contain;margin-bottom:2px;}
  .print-logo-right{margin-left:auto;}
  .print-header-left .doc-name,.print-header-right .chamber-label{font-weight:bold;font-size:14px;display:block;margin-bottom:2px;}
  .patient-line{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 20px;margin-bottom:10px;padding:6px 0;border-bottom:1px solid #000;font-size:12px;min-height:${printSetup.patientInfoHeightCm}cm;${printSetup.printPatientInfo ? '' : 'display:none;'}}
  .patient-line span{white-space:nowrap;}
  .print-body{display:flex;gap:0.4cm;margin-top:10px;flex:1;}
  .print-left{min-width:0;width:${printSetup.leftWidthCm}cm;min-height:${printSetup.leftHeightCm}cm;}
  .print-right{min-width:0;width:${printSetup.rightWidthCm}cm;min-height:${printSetup.rightHeightCm}cm;border-left:2px solid #000;padding-left:0.35cm;position:relative;}
  .print-left .section{margin-bottom:10px;}
  .section-title{font-weight:bold;margin-bottom:2px;}
  .section-title-ul{font-weight:bold;text-decoration:underline;margin-bottom:2px;}
  .barcode-block{margin-bottom:8px;}
  .barcode-block img{height:36px;display:block;margin-bottom:2px;}
  .barcode-digits{font-size:11px;letter-spacing:2px;}
  .rx-title{font-weight:bold;font-size:18px;margin-bottom:10px;}
  .rx-item{margin-bottom:12px;}
  .rx-line1{font-weight:bold;}
  .rx-line2{color:#000;}
  .diagnosis{margin-top:12px;font-weight:bold;}
  .print-footer{margin-top:auto;padding-top:0.2cm;border-top:1px solid #000;font-size:12px;text-align:center;min-height:${printSetup.footerHeightCm}cm;letter-spacing:0;word-spacing:0;font-family:'Noto Sans Bengali', Arial, sans-serif;${showFooter ? '' : 'display:none;'}}
  .barcode-rt{position:absolute;top:0;right:0;text-align:right;}
  .barcode-rt img{height:36px;display:block;}
  @media print{body{padding:10px;} .print-header,.patient-line{break-inside:avoid;}}
</style></head>
<body>
  <div class="page">
  <div class="print-header">
    <div class="print-header-left">
      ${doctorLogoAttr ? `<img class="print-logo" src="${doctorLogoAttr}" alt="Doctor logo" />` : ''}
      <span class="doc-name">${(doc || '').replace(/</g, '&lt;')}</span>
      ${qual ? qual + '<br>' : ''}
      ${spec ? spec + '<br>' : ''}
      ${dept ? dept + '<br>' : ''}
      ${college ? college + '<br>' : ''}
      ${bmdc ? 'BMDC Reg. No- ' + bmdc.replace(/</g, '&lt;') : ''}
    </div>
    <div class="print-header-right">
      ${clinicLogoAttr ? `<img class="print-logo print-logo-right" src="${clinicLogoAttr}" alt="Clinic logo" />` : ''}
      <span class="chamber-label">Chember:</span>
      ${clinic ? clinic + '<br>' : ''}
      ${addr ? addr + '<br>' : ''}
      ${ph ? 'Mobile: ' + ph + '<br>' : ''}
      ${visitTime ? 'Visit Time ' + visitTime + '<br>' : ''}
      ${dayOff ? dayOff : ''}
    </div>
  </div>
  <div class="patient-line">
    ${patientFields.join('')}
  </div>
  <div class="print-body">
    <div class="print-left">
      ${showBarcode && !barcodeRightTop ? `<div class="barcode-block">
        <img src="https://barcode.tec-it.com/barcode.ashx?data=${barcodeData}&code=Code128&dpi=96" alt="barcode" />
        <span class="barcode-digits">${barcodeDigits.replace(/</g, '&lt;')}</span><br>
        ${printSetup.displayVisitNo ? `<span class="section-title">Visit No:</span> ${(visit.visitNo || '—').replace(/</g, '&lt;')}` : ''}
      </div>` : (printSetup.displayVisitNo ? `<div class="section"><span class="section-title">Visit No:</span> ${(visit.visitNo || '—').replace(/</g, '&lt;')}</div>` : '')}
      ${printSetup.showCC ? `<div class="section"><span class="section-title">C/C</span><br>${(cc || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>` : ''}
      ${printSetup.showOE ? `<div class="section"><span class="section-title">O/E</span><br>${oeDisplay || '—'}${bmiStr ? '<br>' + bmiStr : ''}</div>` : ''}
      <div class="section"><span class="section-title">D/H</span><br>${(drugHistory || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>
      ${shouldPrintPresent ? `<div class="section"><span class="section-title-ul">Present History</span><br>${(presentHistory || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>` : ''}
      ${shouldPrintPast ? `<div class="section"><span class="section-title-ul">Past History</span><br>${(pastHistory || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>` : ''}
      ${shouldPrintEdd ? `<div class="section"><span class="section-title">EDD</span><br>${(edd.edd || edd.lmp || '—').replace(/</g, '&lt;')}</div>` : ''}
      ${shouldPrintNotes ? `<div class="section"><span class="section-title">Notes</span><br>${(notesHistory || '—').replace(/\n/g, '<br>').replace(/</g, '&lt;')}</div>` : ''}
      ${printSetup.showAdvice ? `<div class="section"><span class="section-title">Advice</span><br>${richHtml || '—'}</div>` : ''}
      ${printSetup.showDx && dx ? `<div class="diagnosis">&#916; ${(dx || '').replace(/\n/g, ' ').replace(/</g, '&lt;').toUpperCase()}</div>` : ''}
    </div>
    <div class="print-right">
      ${showBarcode && barcodeRightTop ? `<div class="barcode-rt"><img src="https://barcode.tec-it.com/barcode.ashx?data=${barcodeData}&code=Code128&dpi=96" alt="barcode" /><span class="barcode-digits">${barcodeDigits.replace(/</g, '&lt;')}</span></div>` : ''}
      ${printSetup.displayRxTitle ? `<div class="rx-title">Rx.</div>` : ''}
      <div class="rx-drug">${drugsList || '—'}</div>
      ${revisitStr ? `<div class="section" style="margin-top:10px;"><strong>** ${revisitStr} ${(printSetup.defaultRevisitText || 'পর আসবেন।').replace(/</g, '&lt;')}</strong></div>` : ''}
    </div>
  </div>
  <div class="print-footer">${footerText.replace(/</g, '&lt;')}</div>
  </div>
</body></html>`;
  }, [patient, visit, dx, cc, getOeDisplayString, drugHistory, presentHistory, pastHistory, notesHistory, edd, drugs, followUpDay, revisitUnit, weight, bmiValue, headerSettings, printEdd, printNotes, printPast, printPresent, printSetup, defaultPrintSetup.footerText]);

  const printViaIframe = (withoutHeader: boolean) => {
    const html = getPrintHtml({ forPrint: true, withoutHeader });
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;left:0;top:0;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    const printFn = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    };
    iframe.onload = () => setTimeout(printFn, 400);
  };

  const openPreviewInNewTab = () => {
    const html = getPrintHtml({ forPrint: false, withoutHeader: false });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener');
    if (w) setTimeout(() => URL.revokeObjectURL(url), 60000);
    else {
      URL.revokeObjectURL(url);
      showNotice('Allow popups to open preview in a new tab, or use Save & Print to print the prescription.');
    }
  };

  const handlePrint = async (withoutHeader: boolean) => {
    const ok = await handleSave();
    if (ok) printViaIframe(withoutHeader);
  };

  const handleSaveAndPrint = async (withoutHeader: boolean) => {
    const ok = await handleSave();
    if (ok) printViaIframe(withoutHeader);
  };

  const handlePreview = () => {
    openPreviewInNewTab();
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const applyTemplate = (key: string) => {
    const k = key.toLowerCase().replace(/\s+/g, '');
    if (k === 'oe' || key === 'O/E') setOe((o) => ({ ...o, heart: 'S1+S2+M0', lungs: 'NAD', abd: 'Soft, Non-Tender' }));
    if (k === 'cc' || key === 'C/C') setCc('Chief complaint here.');
    if (k === 'drug') {
      setDrugs((d) => [...d, { ...createDrugRow(), brand: 'Sample Drug', dose: '1x1', duration: '7', durationUnit: 'D', beforeFood: false, afterFood: false }]);
      setDrugInfoCnt('Sample Drug | 1x1 | 7 D');
    }
    if (k === 'treatment') {
      if (richTextRef.current) richTextRef.current.innerHTML += '<p>Rest. Continue treatment as advised.</p>';
    }
    if (k === 'advice') {
      if (richTextRef.current) richTextRef.current.innerHTML += '<p><b><u>Advice:</u></b><br>Follow up as advised.</p>';
    }
    if (k === 'ix' || key === 'I/X') setIx('CBC, RBS, as indicated.');
  };

  const handleTemplateMenuClick = (item: { label: string; action: string }) => {
    const action = item.action;
    if (action === 'drug') applyTemplate('drug');
    else if (action === 'treatment') applyTemplate('treatment');
    else if (action === 'advice') applyTemplate('advice');
    else if (action === 'cc') applyTemplate('cc');
    else if (action === 'oe') applyTemplate('oe');
    else if (action === 'ix') applyTemplate('ix');
    else showNotice(`${item.label} – template applied!`);
  };

  const handlePageSetupClick = (item: { label: string; action: string }) => {
    if (item.action === 'printPreview') {
      handlePreview();
      return;
    }
    setActiveNav('page-setup');
    if (item.action === 'pageSetup' || item.action === 'pageOption' || item.action === 'settings') {
      setPrintSetupTab(item.action);
      return;
    }
    showNotice(`${item.label} - Settings opened!`);
  };

  const handleSmsClick = (item: { label: string; action: string }) => {
    showNotice(`${item.label} - SMS panel opened!`);
  };

  const handleAccountClick = (item: { label: string; action: string }) => {
    if (item.action === 'logout') {
      onBackToLogin();
    } else if (item.action === 'about') {
      showNotice('BaigDentPro v2.0 - Professional Dental Management System by Omix Solutions');
    } else {
      showNotice(`${item.label} - Settings opened!`);
    }
  };

  // Drug Database Search Function
  const searchDrugDatabase = useCallback(() => {
    const results = DRUG_DATABASE.filter(drug => {
      const matchCompany = !drugDbSearch.company || drug.company.toLowerCase().includes(drugDbSearch.company.toLowerCase());
      const matchGeneric = !drugDbSearch.generic || drug.generic.toLowerCase().includes(drugDbSearch.generic.toLowerCase());
      const matchBrand = !drugDbSearch.brand || drug.brand.toLowerCase().includes(drugDbSearch.brand.toLowerCase());
      return matchCompany && matchGeneric && matchBrand;
    });
    setDrugDbResults(results);
  }, [drugDbSearch]);

  useEffect(() => {
    searchDrugDatabase();
  }, [searchDrugDatabase]);

  // Sync BMI weight/height to Insulin, BMR, Z-Score (ZilSoft behavior)
  useEffect(() => {
    setInsulin((i) => (weight !== i.weight ? { ...i, weight } : i));
    setBmr((b) => (weight !== b.weight || heightFeet !== b.height || heightInch !== b.inch ? { ...b, weight, height: heightFeet, inch: heightInch } : b));
    setZscore((z) => (weight !== z.weight ? { ...z, weight } : z));
  }, [weight, heightFeet, heightInch]);

  // Sync patient age to BMR age
  useEffect(() => {
    if (patient.age !== undefined && patient.age !== '' && /^\d+$/.test(String(patient.age))) {
      setBmr((b) => (b.age !== patient.age ? { ...b, age: patient.age } : b));
    }
  }, [patient.age]);

  // Z-Score: compute age in days from DOB
  useEffect(() => {
    if (!zscore.dob) return;
    const dob = new Date(zscore.dob);
    if (isNaN(dob.getTime())) return;
    const today = new Date();
    const diffMs = today.getTime() - dob.getTime();
    const ageDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    setZscore((z) => (z.ageDays !== String(ageDays) ? { ...z, ageDays: String(ageDays >= 0 ? ageDays : 0) } : z));
  }, [zscore.dob]);

  const loadPatientFromSaved = (p: { patient?: { name?: string; age?: string; sex?: string; address?: string; mobile?: string; regNo?: string; date?: string } }) => {
    const q = p.patient;
    if (q) {
      setPatient({
        name: q.name ?? '',
        age: q.age ?? '',
        sex: q.sex ?? '',
        address: q.address ?? '',
        mobile: q.mobile ?? '',
        regNo: q.regNo ?? '',
        date: q.date ?? new Date().toISOString().slice(0, 10),
      });
    }
    setShowPatientSearch(false);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    setUploadedFileName(files[0].name);
  };

  // Insulin calculation
  useEffect(() => {
    const w = parseFloat(insulin.weight);
    if (w <= 0) return;
    const u = parseFloat(insulin.unitKg) || 0.3;
    const total = w * u;
    const t = insulin.time;
    const dose = t === '2' ? `${Math.round(total / 3 * 2)} + 0 + ${Math.round(total / 3)} (±2)` : t === '3' ? `${Math.round(total / 3)} + ${Math.round(total / 3)} + ${Math.round(total / 3)} (±2)` : total.toFixed(0);
    setInsulin((i) => ({ ...i, totalUnit: total.toFixed(0), dose }));
  }, [insulin.weight, insulin.unitKg, insulin.time]);

  // BMR calculation
  useEffect(() => {
    const w = parseFloat(bmr.weight);
    const h = (parseFloat(bmr.height) || 0) * 12 + (parseFloat(bmr.inch) || 0);
    const heightCm = h * 2.54;
    const age = parseFloat(bmr.age) || 0;
    const act = parseFloat(bmr.activity) || 1.2;
    if (w > 0 && h > 0 && age > 0) {
      let base: number;
      if (bmr.gender === 'Male') base = 66.47 + 13.75 * w + 5.003 * heightCm - 6.755 * age;
      else base = 655.1 + 9.563 * w + 1.85 * heightCm - 4.676 * age;
      setBmr((b) => ({ ...b, bmrVal: base.toFixed(0), calorieNeed: `Calorie Need: ${(base * act).toFixed(0)} Kcal/day` }));
    }
  }, [bmr.weight, bmr.height, bmr.inch, bmr.age, bmr.activity, bmr.gender]);

  // EDD calculation
  const computeEdd = useCallback((lmpVal?: string) => {
    const v = (lmpVal ?? edd.lmp)?.trim() || '';
    if (!v) {
      setEdd((e) => ({ ...e, lmp: '', gestAge: '', edd: '' }));
      return;
    }
    const lmpDate = new Date(v);
    if (isNaN(lmpDate.getTime())) return;
    const eddDate = new Date(lmpDate);
    eddDate.setDate(eddDate.getDate() + 280);
    const today = new Date();
    const diffMs = today.getTime() - lmpDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    const gestAgeStr = diffDays >= 0 ? `${weeks} weeks ${days} days` : '—';
    setEdd((e) => ({ ...e, lmp: v, edd: eddDate.toLocaleDateString(), gestAge: gestAgeStr }));
  }, [edd.lmp]);

  const savedList = (() => {
    try {
      const raw = localStorage.getItem('baigdentpro:prescriptions');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  // Render placeholder pages for different sections
  const renderPlaceholderPage = (title: string, message: string, icon: string) => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '24px', opacity: 0.5 }}></i>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>{message}</p>
        <button type="button" className="btn-primary" onClick={() => showNotice('This feature is available in the full version!')}>
          <i className="fa-solid fa-rocket"></i> Explore Premium Features
        </button>
      </div>
    </main>
  );

  // Drug Database Page
  const renderDrugDatabase = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}><i className="fa-solid fa-database"></i> Drug Database</h2>
        <span style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
          {DRUG_NUM_DRUGS} Drugs Available
        </span>
      </div>
      
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="form-group">
            <label className="label">Company</label>
            <input 
              className="input" 
              placeholder="Search by company..."
              value={drugDbSearch.company}
              onChange={(e) => setDrugDbSearch({ ...drugDbSearch, company: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Generic Name</label>
            <input 
              className="input" 
              placeholder="Search by generic..."
              value={drugDbSearch.generic}
              onChange={(e) => setDrugDbSearch({ ...drugDbSearch, generic: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Brand Name</label>
            <input 
              className="input" 
              placeholder="Search by brand..."
              value={drugDbSearch.brand}
              onChange={(e) => setDrugDbSearch({ ...drugDbSearch, brand: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button type="button" className="btn-primary" onClick={searchDrugDatabase}>
            <i className="fa-solid fa-search"></i> Search
          </button>
          <button type="button" className="btn-secondary" style={{ marginLeft: '8px' }} onClick={() => setDrugDbSearch({ company: '', generic: '', brand: '' })}>
            <i className="fa-solid fa-redo"></i> Reset
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <table className="drugs-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Generic Name</th>
              <th>Brand Name</th>
              <th>Strength</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {drugDbResults.map((drug, i) => (
              <tr key={i}>
                <td>{drug.company}</td>
                <td>{drug.generic}</td>
                <td><strong>{drug.brand}</strong></td>
                <td>{drug.strength}</td>
                <td>
                  <button 
                    type="button" 
                    className="btn-primary btn-sm"
                    onClick={() => {
                      setRxBrand(drug.brand);
                      setActiveNav('prescription');
                      showNotice(`Added ${drug.brand} to prescription`);
                    }}
                  >
                    <i className="fa-solid fa-plus"></i> Add to Rx
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {drugDbResults.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-search" style={{ fontSize: '2rem', marginBottom: '12px' }}></i>
            <p>No drugs found. Try different search criteria.</p>
          </div>
        )}
      </div>
    </main>
  );

  // Appointments Page
  const renderAppointments = () => {
    const today = new Date().toISOString().slice(0, 10);
    const appointments = [
      { time: '09:00 AM', patient: 'Ahmed Khan', phone: '017XXXXXXXX', status: 'Completed' },
      { time: '10:30 AM', patient: 'Fatima Begum', phone: '018XXXXXXXX', status: 'Waiting' },
      { time: '11:00 AM', patient: 'Rahim Uddin', phone: '019XXXXXXXX', status: 'Confirmed' },
      { time: '02:00 PM', patient: 'Samina Aktar', phone: '016XXXXXXXX', status: 'Confirmed' },
    ];

    return (
      <main className="prescription-shell" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}><i className="fa-solid fa-calendar-check"></i> Appointments</h2>
          <button type="button" className="btn-primary" onClick={() => showNotice('New appointment form opened!')}>
            <i className="fa-solid fa-plus"></i> New Appointment
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card stat-primary">
            <div className="stat-value">12</div>
            <div className="stat-label">Today's Appointments</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-value">5</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>4</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pending</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>3</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Confirmed</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Today's Schedule - {today}</h3>
          <table className="drugs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, i) => (
                <tr key={i}>
                  <td><strong>{appt.time}</strong></td>
                  <td>{appt.patient}</td>
                  <td>{appt.phone}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem',
                      background: appt.status === 'Completed' ? 'var(--success-color)' : appt.status === 'Waiting' ? 'var(--warning-color)' : 'var(--secondary-color)',
                      color: 'white'
                    }}>
                      {appt.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="records-table-btn records-table-btn-view"><i className="fa-solid fa-eye"></i></button>
                    <button type="button" className="records-table-btn records-table-btn-edit"><i className="fa-solid fa-edit"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  };

  // Payment Page
  const renderPayment = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}><i className="fa-solid fa-file-invoice-dollar"></i> Payments & Billing</h2>
        <button type="button" className="btn-primary" onClick={() => showNotice('New invoice form opened!')}>
          <i className="fa-solid fa-plus"></i> New Invoice
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="stat-value stat-primary">45,000</div>
          <div className="stat-label">Today's Income</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="stat-value stat-success">3,500</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="stat-value stat-secondary">12,500</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>8,000</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Due</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Recent Transactions</h3>
        <table className="drugs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2024-01-15</td>
              <td>Ahmed Khan</td>
              <td>Tooth Extraction</td>
              <td>1,500 TK</td>
              <td><span style={{ color: 'var(--success-color)' }}>Paid</span></td>
            </tr>
            <tr>
              <td>2024-01-15</td>
              <td>Fatima Begum</td>
              <td>Root Canal</td>
              <td>8,000 TK</td>
              <td><span style={{ color: 'var(--success-color)' }}>Paid</span></td>
            </tr>
            <tr>
              <td>2024-01-14</td>
              <td>Rahim Uddin</td>
              <td>Cleaning</td>
              <td>800 TK</td>
              <td><span style={{ color: 'var(--danger-color)' }}>Due</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );

  // Header Edit Page
  const renderHeaderEdit = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 24px' }}><i className="fa-solid fa-heading"></i> Header / Clinic Settings</h2>
      
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Clinic Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div className="form-group">
            <label className="label">Doctor Name</label>
            <input 
              className="input" 
              value={headerSettings.doctorName}
              onChange={(e) => setHeaderSettings({ ...headerSettings, doctorName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Doctor Logo</label>
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
                  setHeaderSettings((prev) => ({ ...prev, doctorLogo: res }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {headerSettings.doctorLogo ? (
              <img
                src={headerSettings.doctorLogo}
                alt="Doctor logo preview"
                style={{ display: 'block', marginTop: 8, maxWidth: 140, maxHeight: 70, objectFit: 'contain', border: '1px solid rgba(226,232,240,1)', borderRadius: 10, padding: 6, background: '#fff' }}
              />
            ) : null}
          </div>
          <div className="form-group">
            <label className="label">Qualification</label>
            <input 
              className="input" 
              value={headerSettings.qualification}
              onChange={(e) => setHeaderSettings({ ...headerSettings, qualification: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Specialization</label>
            <input 
              className="input" 
              value={headerSettings.specialization}
              onChange={(e) => setHeaderSettings({ ...headerSettings, specialization: e.target.value })}
              placeholder="e.g. Medicine Specialist"
            />
          </div>
          <div className="form-group">
            <label className="label">Department</label>
            <input 
              className="input" 
              value={headerSettings.department}
              onChange={(e) => setHeaderSettings({ ...headerSettings, department: e.target.value })}
              placeholder="e.g. Department Of Medicine"
            />
          </div>
          <div className="form-group">
            <label className="label">College / Affiliation</label>
            <input 
              className="input" 
              value={headerSettings.college}
              onChange={(e) => setHeaderSettings({ ...headerSettings, college: e.target.value })}
              placeholder="e.g. Demo Medical College"
            />
          </div>
          <div className="form-group">
            <label className="label">BMDC Reg. No</label>
            <input 
              className="input" 
              value={headerSettings.bmdcRegNo}
              onChange={(e) => setHeaderSettings({ ...headerSettings, bmdcRegNo: e.target.value })}
              placeholder="e.g. 112589"
            />
          </div>
          <div className="form-group">
            <label className="label">Clinic Name</label>
            <input 
              className="input" 
              value={headerSettings.clinicName}
              onChange={(e) => setHeaderSettings({ ...headerSettings, clinicName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Clinic Logo</label>
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
                  setHeaderSettings((prev) => ({ ...prev, clinicLogo: res }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {headerSettings.clinicLogo ? (
              <img
                src={headerSettings.clinicLogo}
                alt="Clinic logo preview"
                style={{ display: 'block', marginTop: 8, maxWidth: 140, maxHeight: 70, objectFit: 'contain', border: '1px solid rgba(226,232,240,1)', borderRadius: 10, padding: 6, background: '#fff' }}
              />
            ) : null}
          </div>
          <div className="form-group">
            <label className="label">Phone</label>
            <input 
              className="input" 
              value={headerSettings.phone}
              onChange={(e) => setHeaderSettings({ ...headerSettings, phone: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Address</label>
            <input 
              className="input" 
              value={headerSettings.address}
              onChange={(e) => setHeaderSettings({ ...headerSettings, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Visit Time</label>
            <input 
              className="input" 
              value={headerSettings.visitTime}
              onChange={(e) => setHeaderSettings({ ...headerSettings, visitTime: e.target.value })}
              placeholder="e.g. 4PM-10PM"
            />
          </div>
          <div className="form-group">
            <label className="label">Day Off</label>
            <input 
              className="input" 
              value={headerSettings.dayOff}
              onChange={(e) => setHeaderSettings({ ...headerSettings, dayOff: e.target.value })}
              placeholder="e.g. Friday Off"
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Email</label>
            <input 
              className="input" 
              value={headerSettings.email}
              onChange={(e) => setHeaderSettings({ ...headerSettings, email: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              try {
                localStorage.setItem(HEADER_SETTINGS_STORAGE_KEY, JSON.stringify(headerSettings));
                showNotice('Header settings saved!');
              } catch {
                showNotice('Failed to save header settings');
              }
            }}
          >
            <i className="fa-solid fa-save"></i> Save Settings
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Preview</h3>
        <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
          {headerSettings.clinicLogo ? (
            <img
              src={headerSettings.clinicLogo}
              alt="Clinic logo preview"
              style={{ display: 'block', margin: '0 auto 10px', maxWidth: 180, maxHeight: 90, objectFit: 'contain', border: '1px solid rgba(226,232,240,1)', borderRadius: 12, padding: 8, background: '#fff' }}
            />
          ) : null}
          <h3 style={{ margin: '0 0 8px', color: 'var(--primary-color)' }}>{headerSettings.clinicName}</h3>
          <p style={{ margin: '0 0 4px', fontWeight: '600' }}>
            {headerSettings.doctorLogo ? (
              <img
                src={headerSettings.doctorLogo}
                alt="Doctor logo preview"
                style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8, width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }}
              />
            ) : null}
            {headerSettings.doctorName}, {headerSettings.qualification}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>{headerSettings.address}</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{headerSettings.phone} | {headerSettings.email}</p>
        </div>
      </div>
    </main>
  );

  // Page Setup
  const savePrintSetup = () => {
    try {
      localStorage.setItem(PRINT_SETUP_STORAGE_KEY, JSON.stringify(printSetup));
      showNotice('Page setup saved!');
    } catch {
      showNotice('Failed to save page setup');
    }
  };

  const resetPrintSetup = () => {
    setPrintSetup(defaultPrintSetup);
    showNotice('Factory reset applied');
  };

  const renderPageSetup = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 24px' }}><i className="fa-solid fa-print"></i> Page Setup</h2>
      
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`btn-secondary ${printSetupTab === 'pageSetup' ? 'active' : ''}`} onClick={() => setPrintSetupTab('pageSetup')}>Page Setup</button>
          <button type="button" className={`btn-secondary ${printSetupTab === 'pageOption' ? 'active' : ''}`} onClick={() => setPrintSetupTab('pageOption')}>Page Option</button>
          <button type="button" className={`btn-secondary ${printSetupTab === 'settings' ? 'active' : ''}`} onClick={() => setPrintSetupTab('settings')}>Settings</button>
        </div>
      </div>

      {printSetupTab === 'pageSetup' && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}><i className="fa-solid fa-ruler-combined"></i> Page Setup (cm)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="form-group">
              <label className="label">Header Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.headerHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, headerHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Header Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.headerWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, headerWidthCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Patient Info Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.patientInfoHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, patientInfoHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Patient Info Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.patientInfoWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, patientInfoWidthCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Left (History) Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.leftHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, leftHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Left (History) Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.leftWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, leftWidthCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Right (Rx) Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.rightHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, rightHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Right (Rx) Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.rightWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, rightWidthCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Footer Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.footerHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, footerHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Footer Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.footerWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, footerWidthCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Page Height</label>
              <input className="input" type="number" step="0.1" value={printSetup.pageHeightCm} onChange={(e) => setPrintSetup({ ...printSetup, pageHeightCm: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Page Width</label>
              <input className="input" type="number" step="0.1" value={printSetup.pageWidthCm} onChange={(e) => setPrintSetup({ ...printSetup, pageWidthCm: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={resetPrintSetup}><i className="fa-solid fa-rotate-left"></i> Factory Reset</button>
            <button type="button" className="btn-primary" onClick={savePrintSetup}><i className="fa-solid fa-save"></i> Save Settings</button>
            <button type="button" className="btn-secondary" onClick={handlePreview}><i className="fa-solid fa-eye"></i> Preview</button>
          </div>
        </div>
      )}

      {printSetupTab === 'pageOption' && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}><i className="fa-solid fa-sliders"></i> Page Option</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Footer Text</label>
              <input className="input" value={printSetup.footerText} onChange={(e) => setPrintSetup({ ...printSetup, footerText: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Print Font Size (pt)</label>
              <input className="input" type="number" value={printSetup.fontSizePt} onChange={(e) => setPrintSetup({ ...printSetup, fontSizePt: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Line Per Page</label>
              <input className="input" type="number" value={printSetup.linePerPage} onChange={(e) => setPrintSetup({ ...printSetup, linePerPage: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Visit Fees</label>
              <input className="input" type="number" value={printSetup.visitFees} onChange={(e) => setPrintSetup({ ...printSetup, visitFees: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Re-Visit Fees</label>
              <input className="input" type="number" value={printSetup.revisitFees} onChange={(e) => setPrintSetup({ ...printSetup, revisitFees: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Re-Visit Validity (days)</label>
              <input className="input" type="number" value={printSetup.revisitValidityDays} onChange={(e) => setPrintSetup({ ...printSetup, revisitValidityDays: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Default Revisit Text</label>
              <input className="input" value={printSetup.defaultRevisitText} onChange={(e) => setPrintSetup({ ...printSetup, defaultRevisitText: e.target.value })} placeholder="(blank) means “পর আসবেন।”" />
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={savePrintSetup}><i className="fa-solid fa-save"></i> Save Settings</button>
          </div>
        </div>
      )}

      {printSetupTab === 'settings' && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}><i className="fa-solid fa-gear"></i> Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="form-group">
              <label className="label">Print Barcode?</label>
              <select className="select" value={printSetup.printBarcode ? 'yes' : 'no'} onChange={(e) => setPrintSetup({ ...printSetup, printBarcode: e.target.value === 'yes' })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Barcode Position</label>
              <select className="select" value={printSetup.barcodePosition} onChange={(e) => setPrintSetup({ ...printSetup, barcodePosition: e.target.value as PrintBarcodePosition })}>
                <option value="leftBottom">Left Bottom Position</option>
                <option value="rightTop">Right Top Position</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Multipage Print?</label>
              <select className="select" value={printSetup.multipage ? 'yes' : 'no'} onChange={(e) => setPrintSetup({ ...printSetup, multipage: e.target.value === 'yes' })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Display Visit No?</label>
              <select className="select" value={printSetup.displayVisitNo ? 'yes' : 'no'} onChange={(e) => setPrintSetup({ ...printSetup, displayVisitNo: e.target.value === 'yes' })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Print Patient’s Info?</label>
              <select className="select" value={printSetup.printPatientInfo ? 'yes' : 'no'} onChange={(e) => setPrintSetup({ ...printSetup, printPatientInfo: e.target.value === 'yes' })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Display text title “Rx.”?</label>
              <select className="select" value={printSetup.displayRxTitle ? 'yes' : 'no'} onChange={(e) => setPrintSetup({ ...printSetup, displayRxTitle: e.target.value === 'yes' })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <label><input type="checkbox" checked={printSetup.showName} onChange={(e) => setPrintSetup({ ...printSetup, showName: e.target.checked })} /> Display “Name”</label>
            <label><input type="checkbox" checked={printSetup.showAge} onChange={(e) => setPrintSetup({ ...printSetup, showAge: e.target.checked })} /> Display “Age”</label>
            <label><input type="checkbox" checked={printSetup.showSex} onChange={(e) => setPrintSetup({ ...printSetup, showSex: e.target.checked })} /> Display “Sex”</label>
            <label><input type="checkbox" checked={printSetup.showWeight} onChange={(e) => setPrintSetup({ ...printSetup, showWeight: e.target.checked })} /> Display “Weight”</label>
            <label><input type="checkbox" checked={printSetup.showDate} onChange={(e) => setPrintSetup({ ...printSetup, showDate: e.target.checked })} /> Display “Date”</label>
            <label><input type="checkbox" checked={printSetup.showAddress} onChange={(e) => setPrintSetup({ ...printSetup, showAddress: e.target.checked })} /> Display “Address”</label>
            <label><input type="checkbox" checked={printSetup.showRegNo} onChange={(e) => setPrintSetup({ ...printSetup, showRegNo: e.target.checked })} /> Display “Reg. No”</label>
            <label><input type="checkbox" checked={printSetup.showMobile} onChange={(e) => setPrintSetup({ ...printSetup, showMobile: e.target.checked })} /> Display “Mobile”</label>
            <label><input type="checkbox" checked={printSetup.showCC} onChange={(e) => setPrintSetup({ ...printSetup, showCC: e.target.checked })} /> Display “C/C”</label>
            <label><input type="checkbox" checked={printSetup.showOE} onChange={(e) => setPrintSetup({ ...printSetup, showOE: e.target.checked })} /> Display “O/E”</label>
            <label><input type="checkbox" checked={printSetup.showAdvice} onChange={(e) => setPrintSetup({ ...printSetup, showAdvice: e.target.checked })} /> Display “Advice”</label>
            <label><input type="checkbox" checked={printSetup.showDx} onChange={(e) => setPrintSetup({ ...printSetup, showDx: e.target.checked })} /> Display “D/x”</label>
            <label><input type="checkbox" checked={printSetup.showFooter} onChange={(e) => setPrintSetup({ ...printSetup, showFooter: e.target.checked })} /> Display “Footer”</label>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div className="form-group">
              <label className="label">Past H/O Print Default</label>
              <select className="select" value={printSetup.defaultPastPrint ? 'print' : 'dont'} onChange={(e) => setPrintSetup({ ...printSetup, defaultPastPrint: e.target.value === 'print' })}>
                <option value="print">Print</option>
                <option value="dont">Don’t Print</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Present H/O Print Default</label>
              <select className="select" value={printSetup.defaultPresentPrint ? 'print' : 'dont'} onChange={(e) => setPrintSetup({ ...printSetup, defaultPresentPrint: e.target.value === 'print' })}>
                <option value="print">Print</option>
                <option value="dont">Don’t Print</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Notes Print Default</label>
              <select className="select" value={printSetup.defaultNotesPrint ? 'print' : 'dont'} onChange={(e) => setPrintSetup({ ...printSetup, defaultNotesPrint: e.target.value === 'print' })}>
                <option value="print">Print</option>
                <option value="dont">Don’t Print</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">EDD Print Default</label>
              <select className="select" value={printSetup.defaultEddPrint ? 'print' : 'dont'} onChange={(e) => setPrintSetup({ ...printSetup, defaultEddPrint: e.target.value === 'print' })}>
                <option value="print">Print</option>
                <option value="dont">Don’t Print</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={savePrintSetup}><i className="fa-solid fa-save"></i> Save Settings</button>
            <button type="button" className="btn-secondary" onClick={handlePreview}><i className="fa-solid fa-eye"></i> Preview</button>
          </div>
        </div>
      )}
    </main>
  );

  // SMS Page
  const renderSms = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}><i className="fa-solid fa-comment-sms"></i> SMS System</h2>
        <span style={{ background: 'var(--success-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
          850 SMS Remaining
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => showNotice('Send appointment SMS')}>
          <i className="fa-solid fa-calendar" style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '12px' }}></i>
          <div style={{ fontWeight: '600' }}>Appointment SMS</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Send appointment reminders</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => showNotice('Send prescription SMS')}>
          <i className="fa-solid fa-prescription" style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '12px' }}></i>
          <div style={{ fontWeight: '600' }}>Prescription SMS</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Send prescription details</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => showNotice('Send custom SMS')}>
          <i className="fa-solid fa-sms" style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '12px' }}></i>
          <div style={{ fontWeight: '600' }}>Custom SMS</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compose custom message</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>SMS Templates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <strong>Appointment Reminder</strong>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dear [Patient Name], Your appointment is scheduled for [Date] at [Time]. Please arrive 10 minutes early. - BaigDentPro</p>
          </div>
          <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <strong>Follow-up Reminder</strong>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dear [Patient Name], Please remember your follow-up visit on [Date]. - BaigDentPro</p>
          </div>
        </div>
      </div>
    </main>
  );

  // Buy Credit Page
  const renderBuyCredit = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 24px' }}><i className="fa-solid fa-coins"></i> Buy Credit / Subscription</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="card" style={{ border: '2px solid var(--border-color)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Starter</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>500 TK</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>per month</div>
          <ul style={{ textAlign: 'left', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>500 SMS</li>
            <li>Basic Features</li>
            <li>Email Support</li>
          </ul>
          <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => showNotice('Purchase initiated!')}>
            Subscribe
          </button>
        </div>

        <div className="card" style={{ border: '2px solid var(--primary-color)', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-color)', color: 'white', padding: '4px 16px', borderRadius: '20px', fontSize: '0.75rem' }}>POPULAR</div>
          <h3 style={{ color: 'var(--primary-color)' }}>Professional</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>1,500 TK</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>per month</div>
          <ul style={{ textAlign: 'left', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>2,000 SMS</li>
            <li>All Features</li>
            <li>Priority Support</li>
            <li>Cloud Backup</li>
          </ul>
          <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => showNotice('Purchase initiated!')}>
            Subscribe
          </button>
        </div>

        <div className="card" style={{ border: '2px solid var(--border-color)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Enterprise</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>3,000 TK</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>per month</div>
          <ul style={{ textAlign: 'left', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>Unlimited SMS</li>
            <li>All Features</li>
            <li>24/7 Support</li>
            <li>Multi-user Access</li>
          </ul>
          <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => showNotice('Purchase initiated!')}>
            Subscribe
          </button>
        </div>
      </div>
    </main>
  );

  const renderPrescriptionNav = () => (
    <nav className="nav-bar">
      <button type="button" className={`nav-tab ${activeNav === 'prescription' ? 'active' : ''}`} onClick={() => setActiveNav('prescription')}>
        <i className="fa-solid fa-prescription"></i> Prescription
      </button>
      <button type="button" className={`nav-tab ${activeNav === 'viewall' ? 'active' : ''}`} onClick={() => setActiveNav('viewall')}>
        <i className="fa-solid fa-list"></i> View All
      </button>
      <button type="button" className={`nav-tab ${activeNav === 'drugdb' ? 'active' : ''}`} onClick={() => setActiveNav('drugdb')}>
        <i className="fa-solid fa-database"></i> Drug Database
      </button>
      <div className="nav-dropdown">
        <button type="button" className="dropbtn"><i className="fa-solid fa-file-medical"></i> Template</button>
        <div className="dropdown-content">
          {TEMPLATE_DROPDOWN.map((item) => (
            <button key={item.label} type="button" onClick={() => handleTemplateMenuClick(item)}>
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className={`nav-tab ${activeNav === 'appointment' ? 'active' : ''}`} onClick={() => setActiveNav('appointment')}>
        <i className="fa-solid fa-calendar-check"></i> Appointment
      </button>
      <button type="button" className={`nav-tab ${activeNav === 'payment' ? 'active' : ''}`} onClick={() => setActiveNav('payment')}>
        <i className="fa-solid fa-file-invoice-dollar"></i> Payment
      </button>
      <button type="button" className={`nav-tab ${activeNav === 'header-edit' ? 'active' : ''}`} onClick={() => setActiveNav('header-edit')}>
        <i className="fa-solid fa-heading"></i> Header Edit
      </button>
      <div className="nav-dropdown">
        <button type="button" className="dropbtn"><i className="fa-solid fa-print"></i> Page Setup</button>
        <div className="dropdown-content">
          {PAGE_SETUP_DROPDOWN.map((item) => (
            <button key={item.label} type="button" onClick={() => handlePageSetupClick(item)}>
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="nav-dropdown">
        <button type="button" className="dropbtn"><i className="fa-solid fa-comment-sms"></i> SMS</button>
        <div className="dropdown-content">
          {SMS_DROPDOWN.map((item) => (
            <button key={item.label} type="button" onClick={() => handleSmsClick(item)}>
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className={`nav-tab ${activeNav === 'buy-credit' ? 'active' : ''}`} onClick={() => setActiveNav('buy-credit')}>
        <i className="fa-solid fa-coins"></i> Buy Credit
      </button>
      <button type="button" className="nav-tab" onClick={() => showNotice('Offline mode - Use without internet!')}>
        <i className="fa-solid fa-wifi"></i> Use Offline
      </button>
      <div className="nav-dropdown">
        <button type="button" className="dropbtn"><i className="fa-solid fa-user-cog"></i> Account</button>
        <div className="dropdown-content">
          {ACCOUNT_DROPDOWN.map((item) => (
            <button key={item.label} type="button" onClick={() => handleAccountClick(item)}>
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );

  // Quick fix for DRUG_DATABASE reference
  const DRUG_NUM_DRUGS = DRUG_DATABASE.length;

  // View All Prescriptions
  if (activeNav === 'viewall') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        <main className="prescription-shell" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2><i className="fa-solid fa-list"></i> All Prescriptions</h2>
            <button type="button" className="btn-secondary" onClick={() => {
              localStorage.removeItem('baigdentpro:prescriptions');
              showNotice('All prescriptions cleared!');
              window.location.reload();
            }}>
              <i className="fa-solid fa-trash"></i> Clear All
            </button>
          </div>
          <p>{savedList.length} prescription(s) saved locally.</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <table className="drugs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient Name</th>
                  <th>Reg No</th>
                  <th>Date</th>
                  <th>DX</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedList.slice().reverse().slice(0, 50).map((p: { patient?: { name?: string; regNo?: string; date?: string }; dx?: string; createdAt?: number }, i: number) => (
                  <tr key={i}>
                    <td>{savedList.length - i}</td>
                    <td>{p.patient?.name || 'Unnamed'}</td>
                    <td>{p.patient?.regNo || '-'}</td>
                    <td>{p.patient?.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-')}</td>
                    <td>{p.dx || '-'}</td>
                    <td>
                      <button type="button" className="records-table-btn records-table-btn-view" onClick={() => showNotice('View prescription details')}>
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {savedList.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-prescription" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
                <p>No prescriptions saved yet.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Drug Database View
  if (activeNav === 'drugdb') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderDrugDatabase()}
      </div>
    );
  }

  // Appointments View
  if (activeNav === 'appointment') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderAppointments()}
      </div>
    );
  }

  // Payment View
  if (activeNav === 'payment') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderPayment()}
      </div>
    );
  }

  // Header Edit View
  if (activeNav === 'header-edit') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderHeaderEdit()}
      </div>
    );
  }

  // Page Setup View
  if (activeNav === 'page-setup') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderPageSetup()}
      </div>
    );
  }

  // SMS View
  if (activeNav === 'sms') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderSms()}
      </div>
    );
  }

  // Buy Credit View
  if (activeNav === 'buy-credit') {
    return (
      <div className="app-shell">
        {renderPrescriptionNav()}
        <div className="user-bar">
          <span className="user-info">
            <strong><i className="fa-solid fa-user"></i> User:</strong> {userName} 
            <span className="badge badge-free">FREE</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onBackToLogin}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
        </div>
        <header className="top-bar">
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
        </header>
        {renderBuyCredit()}
      </div>
    );
  }

  const formContent = (
    <>
      <main className="prescription-shell">
        <div className="rx-create">
          <header className="rx-create-header">
            <h2><i className="fa-solid fa-file-prescription"></i> Create Prescription</h2>
            <p>Patient details, clinical notes, medications, and print options</p>
          </header>
          {embeddedInDashboard && patientsDirectory && patientsDirectory.length > 0 && (
            <div
              className="rx-clinic-patient-bar"
              style={{
                marginBottom: 12,
                padding: '12px 14px',
                background: 'var(--bg-card, #f8fafc)',
                borderRadius: 8,
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                <i className="fa-solid fa-hospital-user" /> Clinic patient
              </label>
              <select
                className="input"
                style={{ maxWidth: '100%', width: 'min(520px, 100%)' }}
                value={linkedPatientId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setLinkedPatientId(id || null);
                  if (!id) return;
                  const row = patientsDirectory.find((x) => x.id === id);
                  if (row) {
                    setPatient((p) => ({
                      ...p,
                      name: row.name,
                      mobile: row.phone,
                      regNo: row.regNo || '',
                      age: row.age || '',
                      sex: row.gender || p.sex,
                      address: row.address || '',
                    }));
                  }
                }}
              >
                <option value="">— Select patient (for server sync) —</option>
                {patientsDirectory.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.phone}
                    {row.regNo ? ` (${row.regNo})` : ''}
                  </option>
                ))}
              </select>
              {api.getToken() ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                  {linkedPatientId ? (
                    <>
                      <i className="fa-solid fa-cloud" /> Logged in — save will sync to the server.
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-info-circle" /> Choose a patient to sync to the server. You can still save locally.
                    </>
                  )}
                </p>
              ) : null}
            </div>
          )}
          <div className="rx-create-top">
            <div className="rx-patient-strip">
              <div className="rx-field">
                <label>Name</label>
                <input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
              </div>
              <div className="rx-field">
                <label>Age</label>
                <input value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} maxLength={4} style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="rx-field">
                <label>Sex</label>
                <input value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })} maxLength={1} style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="rx-field" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input value={patient.address} onChange={(e) => setPatient({ ...patient, address: e.target.value })} />
              </div>
              <div className="rx-field">
                <label>Mobile</label>
                <input value={patient.mobile} onChange={(e) => setPatient({ ...patient, mobile: e.target.value })} />
                {patient.mobile.trim() ? (
                  <a
                    href={`tel:${patient.mobile.replace(/\s/g, '')}`}
                    className="rx-tel-link"
                    style={{ fontSize: 12, display: 'inline-block', marginTop: 4 }}
                  >
                    <i className="fa-solid fa-phone" /> Call
                  </a>
                ) : null}
              </div>
              <div className="rx-field">
                <label>Reg No.</label>
                <div className="reg-search-wrap">
                  <input value={patient.regNo} onChange={(e) => setPatient({ ...patient, regNo: e.target.value })} />
                  <button type="button" className="btn-icon-sm" title="Search patient" onClick={() => setShowPatientSearch(true)}><i className="fa-solid fa-search"></i></button>
                </div>
              </div>
              <div className="rx-field">
                <label>Q Appointment</label>
                <button type="button" className="btn-secondary" style={{ width: '100%', padding: '8px 10px' }} onClick={() => setShowAppointmentModal(true)}>
                  <i className="fa-solid fa-calendar-plus"></i> Appointment
                </button>
              </div>
              <div className="rx-field">
                <label>Date</label>
                <input type="date" value={patient.date} onChange={(e) => setPatient({ ...patient, date: e.target.value })} />
              </div>
            </div>
            <div className="rx-create-actions">
              <button type="button" className="btn-secondary action-btn-with-icon" onClick={handlePreview} disabled={savingPrescription}>
                <span><i className="fa-solid fa-eye"></i></span> Preview
              </button>
              <button type="button" className="btn-primary action-btn-with-icon" onClick={() => handleSaveAndPrint(false)} disabled={savingPrescription}>
                <span>{savingPrescription ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-print" />}</span>{' '}
                Save & Print
              </button>
              <button type="button" className="btn-secondary action-btn-with-icon" onClick={() => handleSaveAndPrint(true)} disabled={savingPrescription}>
                <span><i className="fa-solid fa-file-pdf"></i></span> Save & Print Without header
              </button>
              <button type="button" className="btn-primary action-btn-with-icon" onClick={() => void handleSave()} disabled={savingPrescription}>
                <span>{savingPrescription ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-save" />}</span> Save Only
              </button>
            </div>
          </div>

          <div className="rx-create-grid">
            {/* Left column - Clinical & Calculators */}
            <div className="rx-create-left">
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-stethoscope"></i> Disease/Condition/Dx</div>
                <textarea className="textarea" rows={2} value={dx} onChange={(e) => setDx(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-comment-medical"></i> C/C</div>
                <textarea className="textarea" rows={2} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Chief complaint" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-heart-pulse"></i> O/E</div>
                <div className="oe-mode-tabs" style={{ marginBottom: 10 }}>
                  <button type="button" className={oeMode === 'oe' ? 'active' : ''} onClick={() => setOeMode('oe')}>O/E</button>
                  <button type="button" className={oeMode === 'oeBox' ? 'active' : ''} onClick={() => setOeMode('oeBox')}>O/E (Box)</button>
                  <button type="button" className={oeMode === 'boxOe' ? 'active' : ''} onClick={transferBoxToOe}>Box → O/E</button>
                  <button type="button" className="oe-box-toggle" onClick={() => setOeBoxVisible((v) => !v)}>{oeBoxVisible ? '[ − ]' : '[+]'}</button>
                </div>
                {oeMode === 'oe' && (
                <textarea className="textarea" rows={3} value={oeText} onChange={(e) => setOeText(e.target.value)} placeholder="On examination (free text)" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 10 }} />
              )}
                <div style={{ display: oeBoxVisible && oeMode === 'oeBox' ? 'block' : 'none' }}>
                  <div className="rx-oe-row">
                    {(['bp', 'pulse', 'temp', 'heart', 'lungs', 'abd', 'anaemia', 'jaundice', 'cyanosis', 'oedema'] as const).map((key) => (
                      <div key={key} className="rx-oe-item">
                        <span>{key === 'abd' ? 'Abd' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <input value={(oe as Record<string, string>)[key]} onChange={(e) => setOe({ ...oe, [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-flask"></i> Ix</div>
                <textarea className="textarea" rows={3} value={ix} onChange={(e) => setIx(e.target.value)} placeholder="Investigations" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-capsules"></i> Drug History</div>
                <div className="drug-history-row">
                  <textarea className="textarea" rows={2} value={drugHistory} onChange={(e) => setDrugHistory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input className="input input-sm" placeholder="Type Brand" value={typeBrand} onChange={(e) => setTypeBrand(e.target.value)} style={{ maxWidth: 120 }} />
                    <button type="button" className="btn-icon-sm" title="Add to drug history" onClick={() => typeBrand.trim() ? setDrugHistory((h) => h + (h ? '\n' : '') + typeBrand) : showNotice('Type a brand then add.')}><i className="fa-solid fa-plus"></i></button>
                  </div>
                </div>
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-calculator"></i> BMI / Insulin / Z-Score / BMR / EDD</div>
                <div className="calc-tabs">
                  {(['bmi', 'insulin', 'zscore', 'bmr', 'edd'] as const).map((t) => (
                    <button key={t} type="button" className={calcTab === t ? 'active' : ''} onClick={() => setCalcTab(t)}>
                      {t === 'zscore' ? 'Z-Score' : t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className={`calc-panel ${calcTab === 'bmi' ? 'active' : ''}`}>
                  <div className="bmi-row">
                    <div className="form-group compact"><label className="label">Weight (Kg)</label><input className="input" value={weight} onChange={(e) => { setWeight(e.target.value); computeBmi(); }} /></div>
                    <div className="form-group compact"><label className="label">Height (Feet)</label><input className="input" value={heightFeet} onChange={(e) => { setHeightFeet(e.target.value); computeBmi(); }} /></div>
                    <div className="form-group compact"><label className="label">Height (Inch)</label><input className="input" value={heightInch} onChange={(e) => { setHeightInch(e.target.value); computeBmi(); }} /></div>
                    <div className="form-group compact"><label className="label">BMI=</label><input className="input" value={bmiValue} readOnly /></div>
                  </div>
                  <div className="patient-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group compact"><label className="label">Class:</label><input className="input" value={classVal} readOnly /></div>
                    <div className="form-group compact"><label className="label">Ideal Weight:</label><input className="input" value={idealWeight} readOnly /></div>
                  </div>
                </div>
                <div className={`calc-panel ${calcTab === 'insulin' ? 'active' : ''}`}>
                  <table><tbody>
                    <tr><td>Weight (Kg)</td><td>Unit/Kg</td><td>Time</td><td>Total Unit=</td></tr>
                    <tr>
                      <td><input className="input input-sm" value={insulin.weight} onChange={(e) => setInsulin((i) => ({ ...i, weight: e.target.value }))} /></td>
                      <td><input className="input input-sm" value={insulin.unitKg} onChange={(e) => setInsulin((i) => ({ ...i, unitKg: e.target.value }))} /></td>
                      <td><select className="select" value={insulin.time} onChange={(e) => setInsulin((i) => ({ ...i, time: e.target.value }))}><option value="3">TDS</option><option value="2">BD</option><option value="1">Mono</option></select></td>
                      <td><input className="input input-sm" value={insulin.totalUnit} readOnly /></td>
                    </tr>
                    <tr><td colSpan={4}><b>Dose:</b> <input className="input input-sm" value={insulin.dose} readOnly style={{ width: '80%' }} /></td></tr>
                  </tbody></table>
                </div>
                <div className={`calc-panel ${calcTab === 'zscore' ? 'active' : ''}`}>
                  <table><tbody>
                    <tr><td>Date Of Birth</td><td>Gender</td><td>Weight (Kg)</td></tr>
                    <tr>
                      <td><input type="date" className="input input-sm" value={zscore.dob} onChange={(e) => setZscore((z) => ({ ...z, dob: e.target.value }))} /></td>
                      <td><label><input type="radio" checked={zscore.gender === 'Male'} onChange={() => setZscore((z) => ({ ...z, gender: 'Male' }))} /> M</label> <label><input type="radio" checked={zscore.gender === 'Female'} onChange={() => setZscore((z) => ({ ...z, gender: 'Female' }))} /> F</label></td>
                      <td><input className="input input-sm" value={zscore.weight} onChange={(e) => setZscore((z) => ({ ...z, weight: e.target.value }))} /></td>
                    </tr>
                    <tr><td colSpan={2}><b>Result:</b> <input className="input input-sm" value={zscore.result} readOnly /></td><td><b><input className="input input-sm" value={zscore.ageDays} readOnly /></b> Days</td></tr>
                  </tbody></table>
                </div>
                <div className={`calc-panel ${calcTab === 'bmr' ? 'active' : ''}`}>
                  <table><tbody>
                    <tr><td>Weight (Kg)</td><td>Height (Feet)</td><td>Height (Inch)</td><td>Gender</td></tr>
                    <tr>
                      <td><input className="input input-sm" value={bmr.weight} onChange={(e) => setBmr((b) => ({ ...b, weight: e.target.value }))} /></td>
                      <td><input className="input input-sm" value={bmr.height} onChange={(e) => setBmr((b) => ({ ...b, height: e.target.value }))} /></td>
                      <td><input className="input input-sm" value={bmr.inch} onChange={(e) => setBmr((b) => ({ ...b, inch: e.target.value }))} /></td>
                      <td><label><input type="radio" checked={bmr.gender === 'Male'} onChange={() => setBmr((b) => ({ ...b, gender: 'Male' }))} /> M</label> <label><input type="radio" checked={bmr.gender === 'Female'} onChange={() => setBmr((b) => ({ ...b, gender: 'Female' }))} /> F</label></td>
                    </tr>
                    <tr>
                      <td><b>Age:</b> <input className="input input-sm" value={bmr.age} onChange={(e) => setBmr((b) => ({ ...b, age: e.target.value }))} style={{ width: 60 }} /></td>
                      <td colSpan={2}><b>Activity:</b> <select className="select" value={bmr.activity} onChange={(e) => setBmr((b) => ({ ...b, activity: e.target.value }))}><option value="1.2">No Exercise</option><option value="1.375">Light Exercise</option><option value="1.55">Moderate</option><option value="1.725">Very Active</option><option value="1.9">Heavy Active</option></select></td>
                      <td><b>BMR:</b> <input className="input input-sm" value={bmr.bmrVal} readOnly /></td>
                    </tr>
                    <tr><td colSpan={4}><div>{bmr.calorieNeed}</div></td></tr>
                  </tbody></table>
                </div>
                <div className={`calc-panel ${calcTab === 'edd' ? 'active' : ''}`}>
                  <table><tbody>
                    <tr><td>LMP</td><td><input type="date" className="input input-sm" value={edd.lmp} onChange={(e) => computeEdd(e.target.value)} /></td></tr>
                    <tr><td>Gestational Age (LMP)</td><td>{edd.gestAge || '—'}</td></tr>
                    <tr><td>EDD (LMP)</td><td><b>{edd.edd || '—'}</b></td></tr>
                  </tbody></table>
                </div>
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-history"></i> History</div>
                <div className="history-tabs">
                  <button type="button" className={historyTab === 'past' ? 'active' : ''} onClick={() => setHistoryTab('past')}>Past History</button>
                  <button type="button" className={historyTab === 'present' ? 'active' : ''} onClick={() => setHistoryTab('present')}>Present History</button>
                  <button type="button" className={historyTab === 'notes' ? 'active' : ''} onClick={() => setHistoryTab('notes')}>Notes</button>
                </div>
                {historyTab === 'past' && <textarea className="textarea" rows={3} value={pastHistory} onChange={(e) => setPastHistory(e.target.value)} placeholder="Past medical history" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }} />}
                {historyTab === 'present' && <textarea className="textarea" rows={3} value={presentHistory} onChange={(e) => setPresentHistory(e.target.value)} placeholder="History of present illness" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }} />}
                {historyTab === 'notes' && <textarea className="textarea" rows={3} value={notesHistory} onChange={(e) => setNotesHistory(e.target.value)} placeholder="Notes" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }} />}
              </div>
              <div className="rx-card">
                <div className="rx-card-title"><i className="fa-solid fa-print"></i> PRINT</div>
                <div className="print-options">
                  <label><input type="checkbox" checked={printPast} onChange={(e) => setPrintPast(e.target.checked)} /> Past H/O</label>
                  <label><input type="checkbox" checked={printPresent} onChange={(e) => setPrintPresent(e.target.checked)} /> Present H/O</label>
                  <label><input type="checkbox" checked={printNotes} onChange={(e) => setPrintNotes(e.target.checked)} /> Notes</label>
                  <label><input type="checkbox" checked={printEdd} onChange={(e) => setPrintEdd(e.target.checked)} /> EDD</label>
                </div>
              </div>
            </div>

            {/* Right column - Drug bar, prescription body, revisit, payment, templates */}
            <div className="rx-create-right">
              <div className="rx-card rx-no-print">
                <div className="rx-card-title"><i className="fa-solid fa-pills"></i> Type Brand Name / Type Dose / Duration</div>
                <div className="rx-drug-bar">
                  <input className="rx-drug-inp brand" placeholder="Type Brand Name" value={rxBrand} onChange={(e) => setRxBrand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrugFromRx())} />
                  <input className="rx-drug-inp dose" placeholder="Type Dose" value={rxDose} onChange={(e) => setRxDose(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrugFromRx())} />
                  <input className="rx-drug-inp dur" placeholder="Duration" value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrugFromRx())} />
                  <button type="button" className="btn-icon-sm" onClick={() => setRxDuration((d) => d + (d ? ' ' : '') + 'দিন')} title="দিন">D</button>
                  <button type="button" className="btn-icon-sm" onClick={() => setRxDuration((d) => d + (d ? ' ' : '') + 'মাস')} title="মাস">M</button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}><input type="checkbox" checked={rxBeforeFood} onChange={(e) => setRxBeforeFood(e.target.checked)} /> খাবার আগে</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}><input type="checkbox" checked={rxAfterFood} onChange={(e) => setRxAfterFood(e.target.checked)} /> খাবার পর</label>
                  <button type="button" className="btn-primary" onClick={handleAddDrugFromRx}><i className="fa-solid fa-plus"></i> ADD</button>
                </div>
                <div className="drug-info-cnt" title="Drug info" style={{ minHeight: 24, marginBottom: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{drugInfoCnt || '\u00A0'}</div>
              </div>
              <div className="rx-card">
                <div className="rich-text-wrap">
                  <div className="rich-text-toolbar">
                    <button type="button" onClick={() => document.execCommand('bold')}><b>B</b></button>
                    <button type="button" onClick={() => document.execCommand('italic')}><i>I</i></button>
                    <button type="button" onClick={() => document.execCommand('underline')}>U</button>
                    <button type="button" onClick={() => document.execCommand('justifyLeft')}><i className="fa-solid fa-align-left"></i></button>
                    <button type="button" onClick={() => document.execCommand('justifyCenter')}><i className="fa-solid fa-align-center"></i></button>
                    <button type="button" onClick={() => document.execCommand('justifyRight')}><i className="fa-solid fa-align-right"></i></button>
                  </div>
                  <div ref={richTextRef} className="rich-text-editor" contentEditable data-placeholder="Prescription notes..." suppressContentEditableWarning />
                </div>
              </div>
              <div className="rx-card">
                <div className="rx-revisit-line">
                  <input type="text" value={followUpDay} onChange={(e) => setFollowUpDay(e.target.value)} placeholder="Revisit" />
                  <label><input type="checkbox" checked={revisitUnit === 'দিন'} onChange={() => setRevisitUnit(revisitUnit === 'দিন' ? '' : 'দিন')} /> দিন</label>
                  <label><input type="checkbox" checked={revisitUnit === 'মাস'} onChange={() => setRevisitUnit(revisitUnit === 'মাস' ? '' : 'মাস')} /> মাস</label>
                  <span className="rx-revisit-suffix">............... পর আসবেন।</span>
                </div>
                <div className="rx-visit-row">
                  <div className="rx-visit-item"><label>Paid (TK)</label><input value={visit.paid} onChange={(e) => setVisit({ ...visit, paid: e.target.value })} /></div>
                  <div className="rx-visit-item"><label>Visit No</label><input value={visit.visitNo} onChange={(e) => setVisit({ ...visit, visitNo: e.target.value })} /></div>
                  <div className="rx-visit-item"><label>Last Visit</label><input value={visit.lastVisit.replace(/\s*days ago/i, '').trim()} onChange={(e) => setVisit({ ...visit, lastVisit: e.target.value ? `${e.target.value} days ago` : '0 days ago' })} /><span> days ago</span></div>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect(e.target.files)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                  <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('upload-zone-dragover'); }} onDragLeave={(e) => e.currentTarget.classList.remove('upload-zone-dragover')} onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('upload-zone-dragover'); handleFileSelect(e.dataTransfer.files); }}>
                    {uploadedFileName ? <><i className="fa-solid fa-check-circle"></i> Uploaded: {uploadedFileName}</> : <><i className="fa-solid fa-cloud-upload-alt"></i> Drag & Drop Upload</>}
                  </div>
                </div>
              </div>
              <table className="drugs-table" style={{ width: '100%', marginBottom: 12 }}>
                <thead><tr><th>Brand name</th><th>Dose</th><th>Duration</th><th></th></tr></thead>
                <tbody>
                  {drugs.map((row) => (
                    <tr key={row.id}>
                      <td><input className="input input-sm" value={row.brand} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, brand: e.target.value } : d)))} /></td>
                      <td><input className="input input-sm" value={row.dose} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, dose: e.target.value } : d)))} /></td>
                      <td><input className="input input-sm" value={row.duration} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, duration: e.target.value } : d)))} style={{ width: 80 }} /> {!/দিন|মাস/.test(row.duration) && <span className="dur-unit">{row.durationUnit}</span>}</td>
                      <td><button type="button" className="btn-ghost btn-icon" onClick={() => setDrugs((list) => list.filter((d) => d.id !== row.id))}><i className="fa-solid fa-times"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn-ghost" onClick={() => setDrugs((d) => [...d, createDrugRow()])}><i className="fa-solid fa-plus"></i> Add drug</button>
              <div className="prescription-actions" style={{ marginTop: 12 }}><span className="helper-pill"><i className="fa-solid fa-check-circle"></i> {status}</span></div>

              <div className="rx-card rx-no-print">
                <div className="rx-card-title"><i className="fa-solid fa-file-medical"></i> Templates</div>
                {TEMPLATE_SEARCH_ITEMS.map(({ key, label, icon }) => (
                  <div key={key} className="rx-template-row">
                    <span className="rx-template-label"><i className={`fa-solid ${icon}`}></i> {key === 'drug' ? 'GET Drug Template' : key === 'generic' ? 'Generic to brand (Random)' : key === 'treatment' ? 'GET Treatment Template' : key === 'advice' ? 'GET Advice Template' : key === 'cc' ? 'GET C/C Template' : key === 'oe' ? 'GET O/E Template' : key === 'ix' ? 'GET I/X Template' : label}</span>
                    <input placeholder="Search..." value={templateSearch[key] ?? ''} onChange={(e) => setTemplateSearch((t) => ({ ...t, [key]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') applyTemplate(key); }} />
                    <button type="button" className="btn-icon-sm" onClick={() => applyTemplate(key)}><i className="fa-solid fa-arrow-right"></i></button>
                  </div>
                ))}
              </div>
              <div className="rx-card rx-no-print">
                <div className="rx-card-title"><i className="fa-solid fa-filter"></i> Filter</div>
                <div className="rx-template-row"><span className="rx-template-label">Company:</span><input value={filter.company} onChange={(e) => setFilter({ ...filter, company: e.target.value })} /></div>
                <div className="rx-template-row"><span className="rx-template-label">Generic:</span><input value={filter.generic} onChange={(e) => setFilter({ ...filter, generic: e.target.value })} /></div>
                <div className="rx-template-row"><span className="rx-template-label">Brand:</span><input value={filter.brand} onChange={(e) => setFilter({ ...filter, brand: e.target.value })} /></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showPatientSearch && (
        <div className="prescription-modal-overlay" onClick={() => setShowPatientSearch(false)}>
          <div className="prescription-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prescription-modal-header">
              <h3><i className="fa-solid fa-search"></i> Search patient (saved prescriptions)</h3>
              <button type="button" className="btn-ghost btn-icon" onClick={() => setShowPatientSearch(false)} aria-label="Close">×</button>
            </div>
            <div className="prescription-modal-body">
              {savedList.length === 0 ? (
                <p><i className="fa-solid fa-info-circle"></i> No saved prescriptions. Save a prescription first, then you can load patient from here.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, maxHeight: 320, overflow: 'auto' }}>
                  {savedList.slice().reverse().slice(0, 50).map((p: { patient?: { name?: string; age?: string; sex?: string; address?: string; mobile?: string; regNo?: string; date?: string }; createdAt?: number }, i: number) => (
                    <li key={i} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => loadPatientFromSaved(p)}>
                      <strong>{p.patient?.name || 'Unnamed'}</strong> | Reg: {p.patient?.regNo || '-'} | {p.patient?.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="prescription-modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="prescription-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prescription-modal-header">
              <h3><i className="fa-solid fa-calendar-plus"></i> Appointment</h3>
              <button type="button" className="btn-ghost btn-icon" onClick={() => setShowAppointmentModal(false)} aria-label="Close">×</button>
            </div>
            <div className="prescription-modal-body">
              <div className="form-group">
                <label className="label">Patient Name</label>
                <input className="input" defaultValue={patient.name} />
              </div>
              <div className="form-group">
                <label className="label">Phone</label>
                <input className="input" defaultValue={patient.mobile} />
              </div>
              <div className="form-group">
                <label className="label">Date</label>
                <input type="date" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Time</label>
                <input type="time" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="textarea" rows={2} placeholder="Appointment notes..."></textarea>
              </div>
              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => { showNotice('Appointment created!'); setShowAppointmentModal(false); }}>
                <i className="fa-solid fa-check"></i> Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embeddedInDashboard) {
    return (
      <>
        {notice && (
          <div className="prescription-notice" role="alert">
            <i className="fa-solid fa-info-circle"></i> {notice}
          </div>
        )}
        {formContent}
      </>
    );
  }

  return (
    <div className="app-shell">
      {notice && (
        <div className="prescription-notice" role="alert">
          <i className="fa-solid fa-info-circle"></i> {notice}
        </div>
      )}
      <a className="whatsapp-float" href="https://wa.me/8801617180711" target="_blank" rel="noopener noreferrer">
        <span>💬</span> Chat with Us on WhatsApp
      </a>
      {renderPrescriptionNav()}
      <div className="user-bar">
        <span className="user-info">
          <strong><i className="fa-solid fa-user"></i> User:</strong> {userName}
          <span className="badge badge-free">FREE</span>
          <span>| <i className="fa-solid fa-database"></i> {DRUG_NUM_DRUGS} Drugs</span>
          <span>| <i className="fa-solid fa-sms"></i> 850 SMS</span>
        </span>
        <button type="button" className="btn-ghost" onClick={onBackToLogin}>
          <i className="fa-solid fa-sign-out-alt"></i> Logout
        </button>
      </div>
      <header className="top-bar">
        <div className="brand"><i className="fa-solid fa-tooth"></i> BaigDentPro</div>
      </header>
      {formContent}
    </div>
  );
};

