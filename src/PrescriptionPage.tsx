import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  { label: 'Page Size (A4/Letter)', icon: 'fa-file', action: 'pageSize' },
  { label: 'Header Options', icon: 'fa-heading', action: 'header' },
  { label: 'Footer Options', icon: 'fa-underline', action: 'footer' },
  { label: 'Logo Upload', icon: 'fa-image', action: 'logo' },
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
  { label: 'About BaigMed', icon: 'fa-info-circle', action: 'about' },
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

export const PrescriptionPage: React.FC<Props> = ({ onBackToLogin, userName = 'User' }) => {
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
  
  // Clinical data
  const [dx, setDx] = useState('');
  const [cc, setCc] = useState('');
  const [oeMode, setOeMode] = useState<'oe' | 'oeBox' | 'boxOe'>('oeBox');
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
  const [followUpMonth, setFollowUpMonth] = useState('');
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
    clinicName: 'BaigMed Dental Care',
    address: '123 Medical Center, Main Road',
    phone: '+880 1617-180711',
    email: 'contact@baigmed.com',
  });

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
    setDrugs((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        brand: rxBrand,
        dose: rxDose,
        duration: rxDuration,
        durationUnit: rxDurationUnit,
        beforeFood: rxBeforeFood,
        afterFood: rxAfterFood,
      },
    ]);
    setRxBrand('');
    setRxDose('');
    setRxDuration('');
  };

  const handleSave = () => {
    const payload = {
      patient,
      dx,
      cc,
      oe,
      ix,
      drugHistory,
      pastHistory,
      presentHistory,
      notesHistory,
      drugs,
      visit,
      richText: richTextRef.current?.innerHTML ?? '',
      createdAt: Date.now(),
    };
    const existingRaw = localStorage.getItem('baigmed:prescriptions');
    const list = existingRaw ? JSON.parse(existingRaw) : [];
    list.push(payload);
    localStorage.setItem('baigmed:prescriptions', JSON.stringify(list));
    setStatus('Saved');
    showNotice('Prescription saved successfully!');
  };

  const handlePrint = (withoutHeader: boolean) => {
    if (withoutHeader) document.body.classList.add('print-no-header');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('print-no-header'), 500);
    }, 100);
  };

  const handleSaveAndPrint = (withoutHeader: boolean) => {
    handleSave();
    handlePrint(withoutHeader);
  };

  const handlePreview = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Preview</title>
      <style>body{font-family:sans-serif;padding:20px;background:#fff;color:#111;}
      table{border-collapse:collapse;} th,td{border:1px solid #ccc;padding:6px;}
      .no-print{display:none;}</style></head><body>
      <h2>Prescription Preview</h2>
      <p><strong>Patient:</strong> ${patient.name} | Age: ${patient.age} | Sex: ${patient.sex} | Reg: ${patient.regNo} | Date: ${patient.date}</p>
      <p><strong>Dx:</strong> ${dx}</p>
      <p><strong>C/C:</strong> ${cc}</p>
      <p><strong>O/E:</strong> BP ${oe.bp} Pulse ${oe.pulse} Temp ${oe.temp} Heart ${oe.heart} Lungs ${oe.lungs} Abd ${oe.abd}</p>
      <p><strong>Ix:</strong> ${ix}</p>
      <table><thead><tr><th>Brand</th><th>Dose</th><th>Duration</th></tr></thead><tbody>
      ${drugs.map((r) => `<tr><td>${r.brand}</td><td>${r.dose}</td><td>${r.duration} ${r.durationUnit}</td></tr>`).join('')}
      </tbody></table>
      <p>Paid: ${visit.paid} TK | Visit No: ${visit.visitNo} | Last Visit: ${visit.lastVisit}</p>
      </body></html>`);
    w.document.close();
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
    showNotice(`${item.label} - Settings opened!`);
  };

  const handleSmsClick = (item: { label: string; action: string }) => {
    showNotice(`${item.label} - SMS panel opened!`);
  };

  const handleAccountClick = (item: { label: string; action: string }) => {
    if (item.action === 'logout') {
      onBackToLogin();
    } else if (item.action === 'about') {
      showNotice('BaigMed v2.0 - Professional Dental Management System by Omix Solutions');
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
  const computeEdd = (lmpVal?: string) => {
    const v = lmpVal ?? edd.lmp;
    if (!v) return;
    const d = new Date(v);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + 280);
    setEdd((e) => ({ ...e, lmp: v, edd: d.toLocaleDateString(), gestAge: '—' }));
  };

  const savedList = (() => {
    try {
      const raw = localStorage.getItem('baigmed:prescriptions');
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
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>12</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Today's Appointments</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>5</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Completed</div>
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
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>45,000</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Today's Income</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>3,500</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This Week</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>12,500</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This Month</div>
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
            <label className="label">Qualification</label>
            <input 
              className="input" 
              value={headerSettings.qualification}
              onChange={(e) => setHeaderSettings({ ...headerSettings, qualification: e.target.value })}
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
          <button type="button" className="btn-primary" onClick={() => showNotice('Header settings saved!')}>
            <i className="fa-solid fa-save"></i> Save Settings
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Preview</h3>
        <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--primary-color)' }}>{headerSettings.clinicName}</h3>
          <p style={{ margin: '0 0 4px', fontWeight: '600' }}>{headerSettings.doctorName}, {headerSettings.qualification}</p>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>{headerSettings.address}</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{headerSettings.phone} | {headerSettings.email}</p>
        </div>
      </div>
    </main>
  );

  // Page Setup
  const renderPageSetup = () => (
    <main className="prescription-shell" style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 24px' }}><i className="fa-solid fa-print"></i> Page Setup</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}><i className="fa-solid fa-file"></i> Page Settings</h3>
          <div className="form-group">
            <label className="label">Page Size</label>
            <select className="select">
              <option>A4 (210 × 297 mm)</option>
              <option>Letter (8.5 × 11 in)</option>
              <option>Legal (8.5 × 14 in)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Orientation</label>
            <select className="select">
              <option>Portrait</option>
              <option>Landscape</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Margins</label>
            <select className="select">
              <option>Normal</option>
              <option>Narrow</option>
              <option>Wide</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}><i className="fa-solid fa-eye"></i> Print Options</h3>
          <div className="print-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label><input type="checkbox" defaultChecked /> Print Header</label>
            <label><input type="checkbox" defaultChecked /> Print Patient Info</label>
            <label><input type="checkbox" defaultChecked /> Print O/E</label>
            <label><input type="checkbox" defaultChecked /> Print Drugs</label>
            <label><input type="checkbox" /> Print History</label>
            <label><input type="checkbox" /> Print Footer</label>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <button type="button" className="btn-primary" onClick={handlePreview}>
          <i className="fa-solid fa-print"></i> Print Preview
        </button>
      </div>
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
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dear [Patient Name], Your appointment is scheduled for [Date] at [Time]. Please arrive 10 minutes early. - BaigMed</p>
          </div>
          <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <strong>Follow-up Reminder</strong>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Dear [Patient Name], Please remember your follow-up visit on [Date]. - BaigMed</p>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
        </header>
        <main className="prescription-shell" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2><i className="fa-solid fa-list"></i> All Prescriptions</h2>
            <button type="button" className="btn-secondary" onClick={() => {
              localStorage.removeItem('baigmed:prescriptions');
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
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
          <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
        </header>
        {renderBuyCredit()}
      </div>
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
        <div className="brand"><i className="fa-solid fa-tooth"></i> BaigMed</div>
        <div className="action-buttons">
          <button type="button" className="btn-secondary action-btn-with-icon" onClick={handlePreview}>
            <span><i className="fa-solid fa-eye"></i></span> Preview
          </button>
          <button type="button" className="btn-primary action-btn-with-icon" onClick={() => handleSaveAndPrint(false)}>
            <span><i className="fa-solid fa-print"></i></span> Save & Print
          </button>
          <button type="button" className="btn-secondary action-btn-with-icon" onClick={() => handleSaveAndPrint(true)}>
            <span><i className="fa-solid fa-file-pdf"></i></span> Print Without Header
          </button>
          <button type="button" className="btn-primary action-btn-with-icon" onClick={handleSave}>
            <span><i className="fa-solid fa-save"></i></span> Save Only
          </button>
        </div>
      </header>
      <main className="prescription-shell">
        <div className="prescription-three-col">
          {/* Left column */}
          <section className="prescription-left">
            <div className="patient-row">
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-user"></i> Name</label>
                <input className="input" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-baby"></i> Age</label>
                <input className="input" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-venus-mars"></i> Sex</label>
                <select className="select" value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })}>
                  <option value="">-</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group compact full-width">
                <label className="label"><i className="fa-solid fa-map-marker-alt"></i> Address</label>
                <input className="input" value={patient.address} onChange={(e) => setPatient({ ...patient, address: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-mobile-alt"></i> Mobile</label>
                <input className="input" value={patient.mobile} onChange={(e) => setPatient({ ...patient, mobile: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-id-card"></i> Reg No.</label>
                <div className="reg-search-wrap">
                  <input className="input" value={patient.regNo} onChange={(e) => setPatient({ ...patient, regNo: e.target.value })} />
                  <button type="button" className="btn-icon-sm" title="Search patient" onClick={() => setShowPatientSearch(true)}><i className="fa-solid fa-search"></i></button>
                </div>
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-calendar"></i> Appointment</label>
                <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowAppointmentModal(true)}>
                  <i className="fa-solid fa-plus"></i> Appointment
                </button>
              </div>
              <div className="form-group compact">
                <label className="label"><i className="fa-solid fa-calendar-day"></i> Date</label>
                <input type="date" className="input" value={patient.date} onChange={(e) => setPatient({ ...patient, date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="label"><i className="fa-solid fa-stethoscope"></i> Disease/Condition/Dx</label>
              <textarea className="textarea" rows={2} value={dx} onChange={(e) => setDx(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label"><i className="fa-solid fa-comment-medical"></i> C/C (Chief Complaint)</label>
              <textarea className="textarea" rows={2} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Chief complaint" />
            </div>
            <div className="oe-mode-tabs">
              <button type="button" className={oeMode === 'oe' ? 'active' : ''} onClick={() => setOeMode('oe')}><i className="fa-solid fa-list"></i> O/E</button>
              <button type="button" className={oeMode === 'oeBox' ? 'active' : ''} onClick={() => setOeMode('oeBox')}><i className="fa-solid fa-th-large"></i> O/E (Box)</button>
              <button type="button" className={oeMode === 'boxOe' ? 'active' : ''} onClick={() => setOeMode('boxOe')}><i className="fa-solid fa-border-all"></i> Box → O/E</button>
              <button type="button" className="oe-box-toggle" onClick={() => setOeBoxVisible((v) => !v)}>{oeBoxVisible ? '[ − ]' : '[+]'}</button>
            </div>
            <div className="prescription-two-col" style={{ display: oeMode === 'oe' ? 'none' : undefined }}>
              <div className="oe-panel" style={{ display: oeBoxVisible && oeMode === 'oeBox' ? undefined : 'none' }}>
                <div className="panel-title"><i className="fa-solid fa-heart-pulse"></i> O/E</div>
                <div className="oe-grid">
                  {(['bp', 'pulse', 'temp', 'heart', 'lungs', 'abd', 'anaemia', 'jaundice', 'cyanosis', 'oedema'] as const).map((key) => (
                    <label key={key} className="oe-label">
                      {key === 'abd' ? 'Abd' : key.charAt(0).toUpperCase() + key.slice(1)}
                      <input className="oe-input" value={(oe as Record<string, string>)[key]} onChange={(e) => setOe({ ...oe, [key]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="ix-panel">
                <div className="panel-title"><i className="fa-solid fa-flask"></i> Ix (Investigation)</div>
                <textarea className="textarea" rows={4} value={ix} onChange={(e) => setIx(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label"><i className="fa-solid fa-capsules"></i> Drug History</label>
              <div className="drug-history-row">
                <textarea className="textarea" rows={2} value={drugHistory} onChange={(e) => setDrugHistory(e.target.value)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    type="button"
                    className="btn-icon-sm"
                    title="Search template"
                    onClick={() => typeBrand.trim() ? setDrugHistory((h) => h + (h ? '; ' : '') + typeBrand) : showNotice('Type a brand in the box then click search to add to drug history.')}
                  >
                    <i className="fa-solid fa-search"></i>
                  </button>
                  <input className="input input-sm" placeholder="Type Brand" value={typeBrand} onChange={(e) => setTypeBrand(e.target.value)} style={{ maxWidth: 100 }} />
                </div>
              </div>
            </div>
            <div className="calc-tabs">
              {(['bmi', 'insulin', 'zscore', 'bmr', 'edd'] as const).map((t) => (
                <button key={t} type="button" className={calcTab === t ? 'active' : ''} onClick={() => setCalcTab(t)}>
                  {t === 'zscore' ? 'Z-Score' : t.toUpperCase()}
                </button>
              ))}
            </div>
            <div className={`calc-panel ${calcTab === 'bmi' ? 'active' : ''}`}>
            <div className="bmi-row">
              <div className="form-group compact">
                <label className="label">Weight (Kg)</label>
                <input className="input" value={weight} onChange={(e) => { setWeight(e.target.value); computeBmi(); }} />
              </div>
              <div className="form-group compact">
                <label className="label">Height (Feet)</label>
                <input className="input" value={heightFeet} onChange={(e) => { setHeightFeet(e.target.value); computeBmi(); }} />
              </div>
              <div className="form-group compact">
                <label className="label">Height (Inch)</label>
                <input className="input" value={heightInch} onChange={(e) => { setHeightInch(e.target.value); computeBmi(); }} />
              </div>
              <div className="form-group compact">
                <label className="label">BMI=</label>
                <input className="input" value={bmiValue} readOnly />
              </div>
            </div>
            <div className="patient-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group compact">
                <label className="label">Class</label>
                <input className="input" value={classVal} readOnly />
              </div>
              <div className="form-group compact">
                <label className="label">Ideal Weight</label>
                <input className="input" value={idealWeight} readOnly />
              </div>
            </div>
            </div>
            <div className={`calc-panel ${calcTab === 'insulin' ? 'active' : ''}`}>
              <table>
                <tbody>
                  <tr><td>Weight (Kg)</td><td>Unit/Kg</td><td>Time</td><td>Total Unit=</td></tr>
                  <tr>
                    <td><input className="input input-sm" value={insulin.weight} onChange={(e) => setInsulin((i) => ({ ...i, weight: e.target.value }))} /></td>
                    <td><input className="input input-sm" value={insulin.unitKg} onChange={(e) => setInsulin((i) => ({ ...i, unitKg: e.target.value }))} /></td>
                    <td>
                      <select className="select" value={insulin.time} onChange={(e) => setInsulin((i) => ({ ...i, time: e.target.value }))}>
                        <option value="3">TDS</option>
                        <option value="2">BD</option>
                        <option value="1">Mono</option>
                      </select>
                    </td>
                    <td><input className="input input-sm" value={insulin.totalUnit} readOnly /></td>
                  </tr>
                  <tr><td colSpan={4}><b>Dose:</b> <input className="input input-sm" value={insulin.dose} readOnly style={{ width: '80%' }} /></td></tr>
                </tbody>
              </table>
            </div>
            <div className={`calc-panel ${calcTab === 'zscore' ? 'active' : ''}`}>
              <table>
                <tbody>
                  <tr><td>Date Of Birth</td><td>Gender</td><td>Weight (Kg)</td></tr>
                  <tr>
                    <td><input type="date" className="input input-sm" value={zscore.dob} onChange={(e) => setZscore((z) => ({ ...z, dob: e.target.value }))} /></td>
                    <td>
                      <label><input type="radio" checked={zscore.gender === 'Male'} onChange={() => setZscore((z) => ({ ...z, gender: 'Male' }))} /> M</label>
                      <label><input type="radio" checked={zscore.gender === 'Female'} onChange={() => setZscore((z) => ({ ...z, gender: 'Female' }))} /> F</label>
                    </td>
                    <td><input className="input input-sm" value={zscore.weight} onChange={(e) => setZscore((z) => ({ ...z, weight: e.target.value }))} /></td>
                  </tr>
                  <tr><td colSpan={2}><b>Result:</b> <input className="input input-sm" value={zscore.result} readOnly /></td><td><b>Age:</b> <input className="input input-sm" value={zscore.ageDays} readOnly /> Days</td></tr>
                </tbody>
              </table>
            </div>
            <div className={`calc-panel ${calcTab === 'bmr' ? 'active' : ''}`}>
              <table>
                <tbody>
                  <tr><td>Weight (Kg)</td><td>Height (Feet)</td><td>Height (Inch)</td><td>Gender</td></tr>
                  <tr>
                    <td><input className="input input-sm" value={bmr.weight} onChange={(e) => setBmr((b) => ({ ...b, weight: e.target.value }))} /></td>
                    <td><input className="input input-sm" value={bmr.height} onChange={(e) => setBmr((b) => ({ ...b, height: e.target.value }))} /></td>
                    <td><input className="input input-sm" value={bmr.inch} onChange={(e) => setBmr((b) => ({ ...b, inch: e.target.value }))} /></td>
                    <td>
                      <label><input type="radio" checked={bmr.gender === 'Male'} onChange={() => setBmr((b) => ({ ...b, gender: 'Male' }))} /> M</label>
                      <label><input type="radio" checked={bmr.gender === 'Female'} onChange={() => setBmr((b) => ({ ...b, gender: 'Female' }))} /> F</label>
                    </td>
                  </tr>
                  <tr>
                    <td><b>Age:</b> <input className="input input-sm" value={bmr.age} onChange={(e) => setBmr((b) => ({ ...b, age: e.target.value }))} style={{ width: 60 }} /></td>
                    <td colSpan={2}><b>Activity:</b>
                      <select className="select" value={bmr.activity} onChange={(e) => setBmr((b) => ({ ...b, activity: e.target.value }))}>
                        <option value="1.2">No Exercise</option>
                        <option value="1.375">Light Exercise</option>
                        <option value="1.55">Moderate</option>
                        <option value="1.725">Very Active</option>
                        <option value="1.9">Heavy Active</option>
                      </select>
                    </td>
                    <td><b>BMR:</b> <input className="input input-sm" value={bmr.bmrVal} readOnly /></td>
                  </tr>
                  <tr><td colSpan={4}><div>{bmr.calorieNeed}</div></td></tr>
                </tbody>
              </table>
            </div>
            <div className={`calc-panel ${calcTab === 'edd' ? 'active' : ''}`}>
              <table>
                <tbody>
                  <tr><td>LMP</td><td><input type="date" className="input input-sm" value={edd.lmp} onChange={(e) => computeEdd(e.target.value)} /></td></tr>
                  <tr><td>Gestational Age (LMP)</td><td>{edd.gestAge || '—'}</td></tr>
                  <tr><td>EDD (LMP)</td><td><b>{edd.edd || '—'}</b></td></tr>
                </tbody>
              </table>
            </div>
            <div className="history-tabs">
              <button type="button" className={historyTab === 'past' ? 'active' : ''} onClick={() => setHistoryTab('past')}>Past History</button>
              <button type="button" className={historyTab === 'present' ? 'active' : ''} onClick={() => setHistoryTab('present')}>Present History</button>
              <button type="button" className={historyTab === 'notes' ? 'active' : ''} onClick={() => setHistoryTab('notes')}>Notes</button>
            </div>
            <div className="form-group">
              {historyTab === 'past' && <textarea className="textarea" rows={3} value={pastHistory} onChange={(e) => setPastHistory(e.target.value)} />}
              {historyTab === 'present' && <textarea className="textarea" rows={3} value={presentHistory} onChange={(e) => setPresentHistory(e.target.value)} />}
              {historyTab === 'notes' && <textarea className="textarea" rows={3} value={notesHistory} onChange={(e) => setNotesHistory(e.target.value)} />}
            </div>
            <div className="print-options">
              <b><i className="fa-solid fa-print"></i> PRINT:</b>
              <label><input type="checkbox" checked={printPast} onChange={(e) => setPrintPast(e.target.checked)} /> Past H/O</label>
              <label><input type="checkbox" checked={printPresent} onChange={(e) => setPrintPresent(e.target.checked)} /> Present H/O</label>
              <label><input type="checkbox" checked={printNotes} onChange={(e) => setPrintNotes(e.target.checked)} /> Notes</label>
              <label><input type="checkbox" checked={printEdd} onChange={(e) => setPrintEdd(e.target.checked)} /> EDD</label>
            </div>
          </section>

          {/* Center column - Rx */}
          <section className="prescription-center">
            <div className="form-group">
              <label className="label"><i className="fa-solid fa-pills"></i> Type Brand Name / Dose / Duration</label>
              <div className="rx-input-row">
                <input className="input" placeholder="Type Brand Name" value={rxBrand} onChange={(e) => setRxBrand(e.target.value)} />
                <input className="input" placeholder="Type Dose" value={rxDose} onChange={(e) => setRxDose(e.target.value)} />
                <input className="input" placeholder="Duration" value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} style={{ maxWidth: 60 }} />
                <div className="duration-unit">
                  <label><input type="radio" checked={rxDurationUnit === 'D'} onChange={() => setRxDurationUnit('D')} /> D</label>
                  <label><input type="radio" checked={rxDurationUnit === 'M'} onChange={() => setRxDurationUnit('M')} /> M</label>
                </div>
                <div className="food-timing">
                  <label><input type="checkbox" checked={rxBeforeFood} onChange={(e) => setRxBeforeFood(e.target.checked)} /> Before Food</label>
                  <label><input type="checkbox" checked={rxAfterFood} onChange={(e) => setRxAfterFood(e.target.checked)} /> After Food</label>
                </div>
                <button type="button" className="btn-primary" onClick={handleAddDrugFromRx}><i className="fa-solid fa-plus"></i> ADD</button>
              </div>
            </div>
            <div className="drug-info-cnt" title="Drug info">{drugInfoCnt || '\u00A0'}</div>
            <div className="rich-text-wrap">
              <div className="rich-text-toolbar">
                <button type="button" onClick={() => document.execCommand('bold')}><b>B</b></button>
                <button type="button" onClick={() => document.execCommand('italic')}><i>I</i></button>
                <button type="button" onClick={() => document.execCommand('underline')}>U</button>
                <button type="button" onClick={() => document.execCommand('justifyLeft')}><i className="fa-solid fa-align-left"></i></button>
                <button type="button" onClick={() => document.execCommand('justifyCenter')}><i className="fa-solid fa-align-center"></i></button>
                <button type="button" onClick={() => document.execCommand('justifyRight')}><i className="fa-solid fa-align-right"></i></button>
              </div>
              <div
                ref={richTextRef}
                className="rich-text-editor"
                contentEditable
                data-placeholder="Prescription notes..."
                suppressContentEditableWarning
              />
            </div>
            <div className="follow-up-row">
              <label><input type="checkbox" /> Follow-up in</label>
              <input className="input" style={{ width: 60 }} value={followUpDay} onChange={(e) => setFollowUpDay(e.target.value)} />
              <label>Days</label>
              <input className="input" style={{ width: 60 }} value={followUpMonth} onChange={(e) => setFollowUpMonth(e.target.value)} />
              <label>Months</label>
            </div>
            <div className="visit-meta-row">
              <div className="form-group compact">
                <label className="label">Paid (TK)</label>
                <input className="input" value={visit.paid} onChange={(e) => setVisit({ ...visit, paid: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label">Visit No</label>
                <input className="input" value={visit.visitNo} onChange={(e) => setVisit({ ...visit, visitNo: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label">Last Visit</label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="input" value={visit.lastVisit.replace(/\s*days ago/i, '').trim()} onChange={(e) => setVisit({ ...visit, lastVisit: e.target.value ? `${e.target.value} days ago` : '0 days ago' })} style={{ width: 60 }} />
                  <span>days ago</span>
                </span>
              </div>
              <div className="form-group compact">
                <label className="label">Next visit (days)</label>
                <input className="input" value={visit.nextVisitDays} onChange={(e) => setVisit({ ...visit, nextVisitDays: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="label"><i className="fa-solid fa-file-upload"></i> Upload File</label>
              <input
                ref={fileInputRef}
                type="file"
                className="input input-file-hidden"
                accept="image/*,.pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('upload-zone-dragover'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('upload-zone-dragover'); } }
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('upload-zone-dragover'); handleFileSelect(e.dataTransfer.files); }}
              >
                {uploadedFileName ? <><i className="fa-solid fa-check-circle"></i> Uploaded: {uploadedFileName}</> : <><i className="fa-solid fa-cloud-upload-alt"></i> Drag & Drop or Click to Upload</>}
              </div>
            </div>
            <table className="drugs-table">
              <thead>
                <tr>
                  <th>Brand name</th>
                  <th>Dose</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((row) => (
                  <tr key={row.id}>
                    <td><input className="input input-sm" value={row.brand} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, brand: e.target.value } : d)))} /></td>
                    <td><input className="input input-sm" value={row.dose} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, dose: e.target.value } : d)))} /></td>
                    <td>
                      <input className="input input-sm" value={row.duration} onChange={(e) => setDrugs((list) => list.map((d) => (d.id === row.id ? { ...d, duration: e.target.value } : d)))} style={{ width: 48 }} />
                      <span className="dur-unit">{row.durationUnit}</span>
                    </td>
                    <td>
                      <button type="button" className="btn-ghost btn-icon" onClick={() => setDrugs((list) => list.filter((d) => d.id !== row.id))}><i className="fa-solid fa-times"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-ghost" onClick={() => setDrugs((d) => [...d, createDrugRow()])}><i className="fa-solid fa-plus"></i> Add drug</button>
            <div className="prescription-actions">
              <span className="helper-pill"><i className="fa-solid fa-check-circle"></i> {status}</span>
            </div>
          </section>

          {/* Right column - templates */}
          <section className="prescription-right">
            <div className="cta-box">
              <div><i className="fa-solid fa-headset"></i> BaigMed Support</div>
              <div>Click here for help & support</div>
            </div>
            <div className="template-list">
              {TEMPLATE_SEARCH_ITEMS.map(({ key, label, icon }) => (
                <div key={key} className="template-row">
                  <span className="template-label"><i className={`fa-solid ${icon}`}></i> {label}</span>
                  <input
                    className="input"
                    placeholder="Search..."
                    value={templateSearch[key] ?? ''}
                    onChange={(e) => setTemplateSearch((t) => ({ ...t, [key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { applyTemplate(key); } }}
                  />
                  <button type="button" className="btn-icon-sm" onClick={() => applyTemplate(key)}><i className="fa-solid fa-arrow-right"></i></button>
                </div>
              ))}
            </div>
            <div className="filter-section">
              <div className="panel-title"><i className="fa-solid fa-filter"></i> Quick Filter</div>
              <div className="form-group compact">
                <label className="label">Company</label>
                <input className="input" value={filter.company} onChange={(e) => setFilter({ ...filter, company: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label">Generic</label>
                <input className="input" value={filter.generic} onChange={(e) => setFilter({ ...filter, generic: e.target.value })} />
              </div>
              <div className="form-group compact">
                <label className="label">Brand</label>
                <input className="input" value={filter.brand} onChange={(e) => setFilter({ ...filter, brand: e.target.value })} />
              </div>
            </div>
          </section>
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
    </div>
  );
};

