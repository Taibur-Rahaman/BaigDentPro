import React, { useState, useMemo } from 'react';

const PATIENTS_STORAGE_KEY = 'baigmed:patients';
const MEDICAL_HISTORY_KEY = (patientId: string) => `baigmed:medicalHistory:${patientId}`;
const TREATMENT_PLANS_KEY = (patientId: string) => `baigmed:treatmentPlans:${patientId}`;

export interface SavedPatient {
  id: string;
  patient_id?: string;
  mobile: string;
  mobile_type?: string;
  name: string;
  age?: string;
  gender?: string;
  blood_group?: string;
  occupation?: string;
  address?: string;
  email?: string;
  image?: string;
  due?: string;
  createdAt: number;
}

export interface MedicalHistory {
  bp?: string;
  heartDisease?: string;
  diabetic?: string;
  hepatitis?: string;
  bleedingDisorder?: string;
  allergy?: string;
  pregnantLactating?: string;
  other?: string;
}

export interface TreatmentPlan {
  id: string;
  toothNumber: string;
  procedure: string;
  cc: string;
  cf: string;
  investigation: string;
  status: string;
}

const MOBILE_TYPE_LABELS: Record<string, string> = {
  '1': 'Self', '2': 'Father', '3': 'Mother', '8': 'Husband', '9': 'Wife', '10': 'Other',
};

/** Dental chart order: top row = Upper Right, Upper Left; bottom row = Lower Right, Lower Left (FDI view) */
const PERMANENT_CHART = [
  { quadrant: 'Upper Right', numbers: [18, 17, 16, 15, 14, 13, 12, 11] },
  { quadrant: 'Upper Left', numbers: [21, 22, 23, 24, 25, 26, 27, 28] },
  { quadrant: 'Lower Right', numbers: [41, 42, 43, 44, 45, 46, 47, 48] },
  { quadrant: 'Lower Left', numbers: [31, 32, 33, 34, 35, 36, 37, 38] },
];

const DECIDUOUS_CHART = [
  { quadrant: 'Upper Right', numbers: [55, 54, 53, 52, 51] },
  { quadrant: 'Upper Left', numbers: [61, 62, 63, 64, 65] },
  { quadrant: 'Lower Right', numbers: [85, 84, 83, 82, 81] },
  { quadrant: 'Lower Left', numbers: [71, 72, 73, 74, 75] },
];

const QUICK_ACTIONS = [
  { icon: 'fa-prescription', label: 'New Prescription', color: '#0d9488' },
  { icon: 'fa-user-plus', label: 'New Patient', color: '#0284c7' },
  { icon: 'fa-calendar-plus', label: 'New Appointment', color: '#f59e0b' },
  { icon: 'fa-file-invoice', label: 'New Invoice', color: '#22c55e' },
];

const STATS = [
  { label: 'Total Patients', value: '1,234', icon: 'fa-users', color: '#0d9488' },
  { label: 'Today Appointments', value: '12', icon: 'fa-calendar-check', color: '#0284c7' },
  { label: 'This Month Income', value: '45,000', icon: 'fa-chart-line', color: '#22c55e' },
  { label: 'Pending Due', value: '8,500', icon: 'fa-credit-card', color: '#f59e0b' },
];

interface Props {
  onBackToLogin: () => void;
  userName?: string;
}

function loadPatients(): SavedPatient[] {
  try {
    const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePatients(patients: SavedPatient[]) {
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

function loadMedicalHistory(patientId: string): MedicalHistory {
  try {
    const raw = localStorage.getItem(MEDICAL_HISTORY_KEY(patientId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMedicalHistory(patientId: string, data: MedicalHistory) {
  localStorage.setItem(MEDICAL_HISTORY_KEY(patientId), JSON.stringify(data));
}

function loadTreatmentPlans(patientId: string): TreatmentPlan[] {
  try {
    const raw = localStorage.getItem(TREATMENT_PLANS_KEY(patientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTreatmentPlans(patientId: string, plans: TreatmentPlan[]) {
  localStorage.setItem(TREATMENT_PLANS_KEY(patientId), JSON.stringify(plans));
}

export const RecordsPage: React.FC<Props> = ({ onBackToLogin, userName = 'User' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [recordsView, setRecordsView] = useState<'home' | 'inventory' | 'patients' | 'appointment' | 'subscription' | 'patient-profile'>('home');
  const [patients, setPatients] = useState<SavedPatient[]>(() => loadPatients());
  const [profilePatient, setProfilePatient] = useState<SavedPatient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<SavedPatient | null>(null);
  const [editingPatient, setEditingPatient] = useState<SavedPatient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<SavedPatient | null>(null);
  const [toothType, setToothType] = useState<'permanent' | 'deciduous'>('permanent');
  const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({});
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const chartQuadrants = toothType === 'permanent' ? PERMANENT_CHART : DECIDUOUS_CHART;
  const allChartNumbers = chartQuadrants.flatMap((q) => q.numbers);

  const toggleTooth = (n: number) => {
    setSelectedTeeth((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectFullMouth = () => setSelectedTeeth(new Set(allChartNumbers));
  const clearToothSelection = () => setSelectedTeeth(new Set());


  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3000); };

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.mobile.includes(q) || (p.patient_id && String(p.patient_id).includes(q)) || (p.address && p.address.toLowerCase().includes(q)));
  }, [patients, searchQuery]);

  const doctorProfile = { name: userName || 'Doctor', title: 'Oral & Dental Surgeon', subscriptionDays: 359, smsRemain: '850', imageUrl: '' };

  const exclusives = [
    { title: '🎉 New Feature: Online Booking', text: 'Patients can now book appointments directly through your website.' },
    { title: '💡 Quick Prescription Tips', text: 'Use templates to save time. Create your own templates for common prescriptions.' },
    { title: '📱 WhatsApp Integration', text: 'Send prescriptions and appointment reminders via WhatsApp instantly.' },
  ];

  const notices = [
    { badge: 'New', date: '15.01.2024', title: 'System Update v2.0', body: 'We have updated BaigMed with new features including improved drug database!' },
    { badge: 'Update', date: '10.01.2024', title: 'New SMS Templates', text: 'Check out our new SMS templates for appointment reminders.' },
  ];

  const todayAppointments = 12;

  function patientFromForm(form: HTMLFormElement, existingId?: string, existingCreatedAt?: number): SavedPatient {
    const fd = new FormData(form);
    return {
      id: existingId ?? crypto.randomUUID(),
      patient_id: fd.get('patient_id') ? String(fd.get('patient_id')) : undefined,
      mobile: String(fd.get('mobile') ?? ''),
      mobile_type: fd.get('mobile_type') ? String(fd.get('mobile_type')) : undefined,
      name: String(fd.get('name') ?? ''),
      age: fd.get('age') ? String(fd.get('age')) : undefined,
      gender: fd.get('gender') ? String(fd.get('gender')) : undefined,
      blood_group: fd.get('blood_group') ? String(fd.get('blood_group')) : undefined,
      occupation: fd.get('occupation') ? String(fd.get('occupation')) : undefined,
      address: fd.get('address') ? String(fd.get('address')) : undefined,
      email: fd.get('email') ? String(fd.get('email')) : undefined,
      due: fd.get('due') ? String(fd.get('due')) : undefined,
      createdAt: existingCreatedAt ?? Date.now(),
    };
  }

  const handleSavePatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newPatient = patientFromForm(form);
    setPatients(prev => { const next = [...prev, newPatient]; savePatients(next); return next; });
    setShowPatientModal(false);
    setEditingPatient(null);
    form.reset();
    showNotice('Patient registered successfully!');
  };

  const handleUpdatePatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    const form = e.currentTarget;
    const updated = patientFromForm(form, editingPatient.id, editingPatient.createdAt);
    setPatients(prev => { const next = prev.map(p => p.id === updated.id ? updated : p); savePatients(next); return next; });
    if (profilePatient?.id === editingPatient.id) setProfilePatient(updated);
    if (viewingPatient?.id === editingPatient.id) setViewingPatient(updated);
    setShowPatientModal(false);
    setEditingPatient(null);
    showNotice('Patient updated successfully!');
  };

  const handleDeletePatient = () => {
    if (!deletingPatient) return;
    setPatients(prev => { const next = prev.filter(p => p.id !== deletingPatient.id); savePatients(next); return next; });
    setDeletingPatient(null);
    showNotice('Patient deleted successfully!');
  };

  const handleSaveMedicalHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profilePatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data: MedicalHistory = {
      bp: String(fd.get('bp') ?? ''), heartDisease: String(fd.get('heartDisease') ?? ''), diabetic: String(fd.get('diabetic') ?? ''),
      hepatitis: String(fd.get('hepatitis') ?? ''), bleedingDisorder: String(fd.get('bleedingDisorder') ?? ''),
      allergy: String(fd.get('allergy') ?? ''), pregnantLactating: String(fd.get('pregnantLactating') ?? ''), other: String(fd.get('other') ?? ''),
    };
    setMedicalHistory(data);
    saveMedicalHistory(profilePatient.id, data);
    setShowMedicalHistoryModal(false);
    showNotice('Medical history saved!');
  };

  const handleSaveTreatmentPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profilePatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const plan: TreatmentPlan = {
      id: editingPlan?.id ?? crypto.randomUUID(),
      toothNumber: String(fd.get('toothNumber') ?? ''), procedure: String(fd.get('procedure') ?? ''),
      cc: String(fd.get('cc') ?? ''), cf: String(fd.get('cf') ?? ''),
      investigation: String(fd.get('investigation') ?? ''), status: String(fd.get('status') ?? 'Not Start'),
    };
    setTreatmentPlans(prev => {
      const next = editingPlan ? prev.map(p => p.id === plan.id ? plan : p) : [...prev, plan];
      saveTreatmentPlans(profilePatient.id, next); return next;
    });
    setShowTreatmentPlanModal(false);
    setEditingPlan(null);
    showNotice('Treatment plan saved!');
  };

  const handleDeleteTreatmentPlan = (plan: TreatmentPlan) => {
    if (!profilePatient) return;
    setTreatmentPlans(prev => { const next = prev.filter(p => p.id !== plan.id); saveTreatmentPlans(profilePatient.id, next); return next; });
    showNotice('Treatment plan deleted!');
  };

  return (
    <div className="app-shell records-shell">
      {notice && (<div className="prescription-notice" role="alert"><i className="fa-solid fa-check-circle"></i> {notice}</div>)}
      
      <header className="records-header">
        <div className="records-header-inner">
          <button type="button" className="records-logo records-logo-btn" onClick={() => setRecordsView('home')}>
            <span className="records-logo-text"><i className="fa-solid fa-tooth"></i> BaigMed</span>
          </button>
          <nav className="records-nav">
            <button type="button" className={`records-nav-link ${recordsView === 'home' ? 'active' : ''}`} onClick={() => { setRecordsView('home'); setProfilePatient(null); }}>
              <i className="fa-solid fa-house"></i> Home
            </button>
            <button type="button" className={`records-nav-link ${recordsView === 'patients' || recordsView === 'patient-profile' ? 'active' : ''}`} onClick={() => setRecordsView('patients')}>
              <i className="fa-solid fa-users"></i> Patients
            </button>
            <button type="button" className={`records-nav-link ${recordsView === 'appointment' ? 'active' : ''}`} onClick={() => setRecordsView('appointment')}>
              <i className="fa-solid fa-calendar-check"></i> Appointments
            </button>
            <button type="button" className={`records-nav-link ${recordsView === 'inventory' ? 'active' : ''}`} onClick={() => setRecordsView('inventory')}>
              <i className="fa-solid fa-boxes-stacked"></i> Inventory
            </button>
            <a className="records-nav-link" href="https://baigmed.com/shop" target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-shop"></i> Shop</a>
            <a className="records-nav-link" href="https://baigmed.com/forum" target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-comments"></i> Forum</a>
          </nav>
        </div>
      </header>

      <div className={`records-main ${recordsView === 'patient-profile' ? 'records-main--profile' : ''}`}>
        {recordsView === 'patient-profile' && profilePatient ? (
          <>
            <div className="patient-profile-layout">
              <aside className="patient-profile-left">
                <div className="records-profile-card">
                  <h6 className="records-section-title">Patient&apos;s Profile</h6>
                  <div className="records-profile-body">
                    <div className="records-avatar records-avatar-placeholder patient-avatar" aria-hidden>{profilePatient.name.slice(0, 2).toUpperCase()}</div>
                    <h2 className="records-doctor-name patient-name">{profilePatient.name}</h2>
                    <p className="patient-profile-meta">{profilePatient.mobile}{profilePatient.mobile_type ? ` · ${MOBILE_TYPE_LABELS[profilePatient.mobile_type] ?? profilePatient.mobile_type}` : ''}</p>
                    <button type="button" className="btn-primary btn-sm" onClick={() => setViewingPatient(profilePatient)}><i className="fa-solid fa-eye" aria-hidden /> Show Details</button>
                    <button type="button" className="btn-ghost btn-sm patient-edit-btn" onClick={() => { setEditingPatient(profilePatient); setShowPatientModal(true); }}><i className="fa-solid fa-pen" aria-hidden /> Edit Profile</button>
                  </div>
                </div>
                <div className="records-profile-card">
                  <div className="patient-profile-actions">
                    <button type="button" className="records-btn-outline full" onClick={() => { setProfilePatient(null); setRecordsView('home'); }}><i className="fa-solid fa-house"></i> Home</button>
                    <button type="button" className="records-btn-outline full"><i className="fa-solid fa-prescription"></i> Write Prescription</button>
                    <button type="button" className="records-btn-outline full"><i className="fa-solid fa-file-invoice-dollar"></i> Billing</button>
                  </div>
                </div>
              </aside>
              <div className="patient-profile-center">
                <div className="records-profile-card tooth-selection-card">
                  <h6 className="records-section-title">Tooth Selection</h6>
                  <div className="tooth-selection-body">
                    <div className="tooth-type-radios">
                      <label className="tooth-radio">
                        <input type="radio" name="toothType" checked={toothType === 'permanent'} onChange={() => { setToothType('permanent'); setSelectedTeeth(new Set()); }} />
                        <span>Permanent Teeth</span>
                      </label>
                      <label className="tooth-radio">
                        <input type="radio" name="toothType" checked={toothType === 'deciduous'} onChange={() => { setToothType('deciduous'); setSelectedTeeth(new Set()); }} />
                        <span>Deciduous Teeth</span>
                      </label>
                    </div>
                    <div
                      className="tooth-chart"
                      onClick={(e) => {
                        const btn = (e.target as HTMLElement).closest('button[data-tooth]');
                        if (btn) { const n = Number((btn as HTMLButtonElement).dataset.tooth); if (!Number.isNaN(n)) toggleTooth(n); }
                      }}
                    >
                      {chartQuadrants.map(({ quadrant, numbers }) => (
                        <div key={quadrant} className="tooth-chart-quadrant">
                          <div className="tooth-chart-label">{quadrant}</div>
                          <div className="tooth-chart-row">
                            {numbers.map((n) => {
                              const isSelected = selectedTeeth.has(n);
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  data-tooth={n}
                                  className={`tooth-chart-tooth ${isSelected ? 'selected' : ''}`}
                                  title={`Tooth ${n} – click to select/deselect`}
                                  style={isSelected ? { background: '#1e40af', borderColor: '#1e3a8a', color: '#fff' } : undefined}
                                  aria-pressed={isSelected}
                                >
                                  {isSelected && <span className="tooth-chart-check" aria-hidden>✓</span>}
                                  <span className="tooth-chart-num">{n}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedTeeth.size > 0 && (
                      <p className="tooth-selection-summary">Selected: {selectedTeeth.size} tooth{selectedTeeth.size !== 1 ? 's' : ''} ({[...selectedTeeth].sort((a, b) => a - b).join(', ')})</p>
                    )}
                    <div className="tooth-selection-buttons">
                      <button type="button" className="btn-primary" onClick={selectFullMouth}><i className="fa-solid fa-check-double" aria-hidden /> Full Mouth</button>
                      <button type="button" className="btn-ghost tooth-clear-btn" onClick={clearToothSelection} title="Clear selection"><i className="fa-solid fa-vector-square" aria-hidden /> Multi Teeth</button>
                    </div>
                  </div>
                </div>
              </div>
              <aside className="patient-profile-right">
                <div className="records-info-box">
                  <h6 className="records-section-title">Medical History</h6>
                  <div className="medical-history-list">
                    <p><strong>BP:</strong> {medicalHistory.bp || '/'}</p>
                    <p><strong>Heart Disease:</strong> {medicalHistory.heartDisease || '—'}</p>
                    <p><strong>Diabetic:</strong> {medicalHistory.diabetic || '—'}</p>
                    <p><strong>Hepatitis:</strong> {medicalHistory.hepatitis || '—'}</p>
                    <p><strong>Bleeding Disorder:</strong> {medicalHistory.bleedingDisorder || '—'}</p>
                    <p><strong>Allergy:</strong> {medicalHistory.allergy || '—'}</p>
                    <p><strong>Pregnant/Lactating:</strong> {medicalHistory.pregnantLactating || '—'}</p>
                    <p><strong>Other:</strong> {medicalHistory.other || '—'}</p>
                  </div>
                  <button type="button" className="btn-primary btn-sm" onClick={() => setShowMedicalHistoryModal(true)}><i className="fa-solid fa-edit"></i> Add/Edit</button>
                </div>
                <div className="records-info-box">
                  <h6 className="records-section-title">Previous Prescription</h6>
                  <p className="records-empty"><i className="fa-solid fa-prescription"></i> No Prescription Added Yet.</p>
                </div>
                <div className="records-info-box">
                  <h6 className="records-section-title">Cost</h6>
                  <p className="cost-estimate"><span className="cost-label">Estimated Cost:</span> <strong>0 TK</strong></p>
                </div>
              </aside>
            </div>
            <section className="treatment-plans-section">
              <h2 className="treatment-plans-banner">Treatment Plans For {profilePatient.name}</h2>
              <div className="treatment-plans-grid">
                {treatmentPlans.length === 0 ? (
                  <p className="records-empty"><i className="fa-solid fa-clipboard-list"></i> No treatment plans yet.</p>
                ) : (
                  treatmentPlans.map(plan => (
                    <div key={plan.id} className="treatment-plan-card">
                      <div className="treatment-plan-card-header"><span className="treatment-plan-tooth"><i className="fa-solid fa-tooth"></i> Tooth No: {plan.toothNumber}</span></div>
                      <div className="treatment-plan-body">
                        <p><strong>{plan.procedure || '—'}</strong></p>
                        <p><strong>CC:</strong> {plan.cc || '—'}</p>
                        <p><strong>CF:</strong> {plan.cf || '—'}</p>
                        <p><strong>Investigation:</strong> {plan.investigation || '—'}</p>
                        <p className="treatment-plan-status">Status: <span className="status-link">{plan.status}</span></p>
                      </div>
                      <div className="treatment-plan-actions">
                        <button type="button" className="records-table-btn records-table-btn-edit" onClick={() => { setEditingPlan(plan); setShowTreatmentPlanModal(true); }}><i className="fa-solid fa-edit"></i> Edit</button>
                        <button type="button" className="btn-primary btn-sm"><i className="fa-solid fa-play"></i> Enter</button>
                        <button type="button" className="records-table-btn records-table-btn-delete" onClick={() => handleDeleteTreatmentPlan(plan)}><i className="fa-solid fa-trash"></i> Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="treatment-plans-add">
                <button type="button" className="btn-primary" onClick={() => { setEditingPlan(null); setShowTreatmentPlanModal(true); }}><i className="fa-solid fa-plus"></i> Add Treatment Plan</button>
              </div>
            </section>
          </>
        ) : (
        <>
        <aside className="records-sidebar">
          <div className="records-profile-card">
            <h6 className="records-section-title">Doctor Profile</h6>
            <div className="records-profile-body">
              <a href="#" className="records-earning-link" onClick={e => { e.preventDefault(); setShowEarningModal(true); }}><i className="fa-solid fa-chart-line"></i></a>
              {doctorProfile.imageUrl ? <img src={doctorProfile.imageUrl} alt="Profile" className="records-avatar" /> : <div className="records-avatar records-avatar-placeholder">DR</div>}
              <h2 className="records-doctor-name">{doctorProfile.name}</h2>
              <p className="records-doctor-title">{doctorProfile.title}</p>
              <p className="records-meta"><i className="fa-solid fa-calendar-day"></i> Subscription: {doctorProfile.subscriptionDays} Days</p>
              <p className="records-meta"><i className="fa-solid fa-sms"></i> SMS: {doctorProfile.smsRemain}</p>
            </div>
          </div>
          <div className="records-profile-card">
            <div className="records-profile-actions">
              <a href="#" title="Profile"><i className="fa-solid fa-user fa-xl" /></a>
              <button type="button" onClick={onBackToLogin} title="Logout"><i className="fa-solid fa-power-off fa-xl" /></button>
            </div>
          </div>
          <div className="records-profile-card records-links">
            <button type="button" className="records-btn-outline" onClick={() => setRecordsView('patients')}><i className="fa-solid fa-users"></i> Patient List</button>
            <button type="button" className="records-btn-outline" onClick={() => setRecordsView('appointment')}><i className="fa-solid fa-calendar-check"></i> Appointment</button>
            <button type="button" className="records-btn-outline" onClick={() => setRecordsView('subscription')}><i className="fa-solid fa-crown"></i> Subscription</button>
          </div>
        </aside>

        <div className="records-center">
          {recordsView === 'home' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {STATS.map((stat, i) => (
                  <div key={i} className="records-profile-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <i className={`fa-solid ${stat.icon}`} style={{ fontSize: '2rem', color: stat.color, marginBottom: '12px' }}></i>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="records-exclusives">
                <h6 className="records-section-title"><i className="fa-solid fa-bolt"></i> Quick Actions</h6>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px' }}>
                  {QUICK_ACTIONS.map((action, i) => (
                    <button key={i} type="button" onClick={() => action.label === 'New Patient' ? setShowPatientModal(true) : showNotice(`${action.label} opened!`)} 
                      style={{ padding: '20px', border: 'none', background: action.color, color: 'white', borderRadius: '12px', cursor: 'pointer' }}>
                      <i className={`fa-solid ${action.icon}`} style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{action.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="records-search-row">
                <div>
                  <h6 className="records-section-title" style={{ textAlign: 'left', marginBottom: '16px' }}><i className="fa-solid fa-search"></i> Search Patient</h6>
                  <div className="records-search-box">
                    <form onSubmit={e => e.preventDefault()}>
                      <input className="input" type="text" placeholder="Search by name, mobile, ID, address" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} name="search" />
                      <button type="button" className="btn-primary" onClick={() => setRecordsView('patients')}><i className="fa-solid fa-search"></i></button>
                    </form>
                  </div>
                </div>
                <div className="records-new-patient">
                  <button type="button" className="btn-primary" onClick={() => setShowPatientModal(true)}><i className="fa-solid fa-user-plus"></i> New Patient Registration</button>
                </div>
              </div>
              <div className="records-appointments">
                <div className="records-section-title records-appointments-header"><i className="fa-solid fa-calendar-check"></i> Today we have {todayAppointments} Appointment(s)</div>
                <div className="records-appointments-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '16px', background: '#f0fdfa', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0d9488' }}>5</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Completed</div></div>
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>4</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Waiting</div></div>
                    <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7' }}>3</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Upcoming</div></div>
                  </div>
                </div>
              </div>
            </>
          )}
          {recordsView === 'patients' && (
            <div className="records-view-panel">
              <h6 className="records-section-title"><i className="fa-solid fa-users"></i> Patient List</h6>
              <div className="records-patient-list-toolbar">
                <div className="records-search-box"><input className="input" type="text" placeholder="Search by name, mobile, ID, address" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <button type="button" className="btn-primary" onClick={() => { setEditingPatient(null); setShowPatientModal(true); }}><i className="fa-solid fa-user-plus"></i> New Patient</button>
              </div>
              {filteredPatients.length === 0 ? (<p className="records-empty">{searchQuery.trim() ? 'No patients match your search.' : 'No patients yet. Register a new patient.'}</p>) : (
                <div className="records-table-wrap">
                  <table className="records-patient-table">
                    <thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Type</th><th>Due</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredPatients.map((p, index) => (
                        <tr key={p.id}>
                          <td>{index + 1}</td><td><strong>{p.name}</strong></td><td>{p.mobile}</td><td>{p.mobile_type ? MOBILE_TYPE_LABELS[p.mobile_type] ?? p.mobile_type : '—'}</td><td>{p.due ?? '—'}</td>
                          <td>
                            <button type="button" className="records-table-btn records-table-btn-view" onClick={() => { setProfilePatient(p); setMedicalHistory(loadMedicalHistory(p.id)); setTreatmentPlans(loadTreatmentPlans(p.id)); setRecordsView('patient-profile'); }}><i className="fa-solid fa-eye"></i></button>
                            <button type="button" className="records-table-btn records-table-btn-edit" onClick={() => { setEditingPatient(p); setShowPatientModal(true); }}><i className="fa-solid fa-edit"></i></button>
                            <button type="button" className="records-table-btn records-table-btn-delete" onClick={() => setDeletingPatient(p)}><i className="fa-solid fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {recordsView === 'inventory' && (<div className="records-view-panel"><h6 className="records-section-title"><i className="fa-solid fa-boxes-stacked"></i> Inventory</h6><div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><i className="fa-solid fa-boxes-stacked" style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.3 }}></i><p>Inventory management module. Connect to API for full functionality.</p></div></div>)}
          {recordsView === 'appointment' && (<div className="records-view-panel"><h6 className="records-section-title"><i className="fa-solid fa-calendar-check"></i> Appointments</h6><div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><i className="fa-solid fa-calendar-check" style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.3 }}></i><p>Today we have {todayAppointments} appointment(s).</p></div></div>)}
          {recordsView === 'subscription' && (
            <div className="records-view-panel">
              <h6 className="records-section-title"><i className="fa-solid fa-crown"></i> Subscription & Credit</h6>
              <div className="records-profile-card" style={{ padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><h3 style={{ margin: '0 0 8px' }}>Current Plan: <strong>Free</strong></h3><p style={{ margin: 0, color: 'var(--text-secondary)' }}>Subscription expires in {doctorProfile.subscriptionDays} days</p></div>
                  <button type="button" className="btn-primary" onClick={() => showNotice('Upgrade options coming soon!')}><i className="fa-solid fa-arrow-up"></i> Upgrade Plan</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="records-profile-card" style={{ padding: '20px', textAlign: 'center' }}><i className="fa-solid fa-sms" style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '12px' }}></i><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{doctorProfile.smsRemain}</div><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SMS Remaining</div></div>
                <div className="records-profile-card" style={{ padding: '20px', textAlign: 'center' }}><i className="fa-solid fa-prescription" style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '12px' }}></i><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>∞</div><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prescriptions</div></div>
                <div className="records-profile-card" style={{ padding: '20px', textAlign: 'center' }}><i className="fa-solid fa-users" style={{ fontSize: '2rem', color: 'var(--success-color)', marginBottom: '12px' }}></i><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>∞</div><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Patients</div></div>
              </div>
            </div>
          )}
        </div>

        <aside className="records-right">
          <div className="records-info-box">
            <h6 className="records-section-title"><i className="fa-solid fa-bullhorn"></i> Admin Notice</h6>
            <div className="records-accordion">
              {notices.map((n, i) => (
                <details key={i} className="records-accordion-item">
                  <summary>{n.badge && <span className="records-badge">{n.badge}</span>}{n.title}</summary>
                  <div className="records-accordion-body">{n.body}</div>
                </details>
              ))}
            </div>
          </div>
          <div className="records-info-box records-ad">
            <h6 className="records-section-title"><i className="fa-solid fa-ad"></i> Advertisement</h6>
            <div className="records-carousel"><div className="records-ad-placeholder" style={{ padding: '30px 16px' }}><i className="fa-solid fa-tooth" style={{ fontSize: '2rem', marginBottom: '12px', color: 'var(--primary-color)' }}></i><div style={{ fontWeight: '600' }}>BaigMed</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Omix Solutions</div></div></div>
          </div>
        </aside>
        </>
        )}
      </div>

      <footer className="records-footer"><p>© 2024 <i className="fa-solid fa-tooth"></i> BaigMed • Professional Dental Management • Omix Solutions</p></footer>

      {showPatientModal && (
        <div className="records-modal-overlay" onClick={() => { setShowPatientModal(false); setEditingPatient(null); }}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-user-plus"></i> {editingPatient ? 'Update Patient' : 'New Patient Registration'}</h5><button type="button" className="records-modal-close" onClick={() => { setShowPatientModal(false); setEditingPatient(null); }}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={editingPatient ? handleUpdatePatient : handleSavePatient} key={editingPatient?.id ?? 'new'}>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">ID</label><input type="number" className="input" name="patient_id" placeholder="Patient ID" defaultValue={editingPatient?.patient_id} /></div>
                  <div className="form-group"><label className="label">Mobile <span className="required">*</span></label><input type="number" className="input" name="mobile" placeholder="Mobile No" required defaultValue={editingPatient?.mobile} /></div>
                  <div className="form-group"><label className="label">Type</label><select className="select" name="mobile_type" defaultValue={editingPatient?.mobile_type ?? '1'}><option value="1">Self</option><option value="2">Father</option><option value="3">Mother</option><option value="8">Husband</option><option value="9">Wife</option><option value="10">Other</option></select></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group" style={{ flex: 2 }}><label className="label">Name <span className="required">*</span></label><input type="text" className="input" name="name" placeholder="Name" required defaultValue={editingPatient?.name} /></div>
                  <div className="form-group"><label className="label">Age</label><input type="number" className="input" name="age" placeholder="Age" defaultValue={editingPatient?.age} /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Gender</label><select className="select" name="gender" defaultValue={editingPatient?.gender ?? ''}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  <div className="form-group"><label className="label">Blood Group</label><select className="select" name="blood_group" defaultValue={editingPatient?.blood_group ?? ''}><option value="">Select</option><option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option></select></div>
                  <div className="form-group"><label className="label">Occupation</label><input type="text" className="input" name="occupation" placeholder="Occupation" defaultValue={editingPatient?.occupation} /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group" style={{ flex: 2 }}><label className="label">Address</label><input type="text" className="input" name="address" placeholder="Address" defaultValue={editingPatient?.address} /></div>
                  <div className="form-group"><label className="label">Due</label><input type="text" className="input" name="due" placeholder="Due" defaultValue={editingPatient?.due} /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group" style={{ flex: 2 }}><label className="label">Email</label><input type="email" className="input" name="email" placeholder="Email" defaultValue={editingPatient?.email} /></div>
                  <div className="form-group"><label className="label">Image</label><input type="file" className="input" name="image" accept="image/*" /></div>
                </div>
                {!editingPatient && (<label className="records-checkbox"><input type="checkbox" name="registration_sms" /> Send SMS to Patient?</label>)}
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => { setShowPatientModal(false); setEditingPatient(null); }}>Close</button><button type="submit" className="btn-primary">{editingPatient ? 'Update' : 'Save'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingPatient && (
        <div className="records-modal-overlay" onClick={() => setViewingPatient(null)}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-user"></i> View Patient</h5><button type="button" className="records-modal-close" onClick={() => setViewingPatient(null)}>×</button></div>
            <div className="records-modal-body records-view-body">
              <dl className="records-dl">
                <dt>ID</dt><dd>{viewingPatient.patient_id ?? '—'}</dd><dt>Name</dt><dd>{viewingPatient.name}</dd><dt>Mobile</dt><dd>{viewingPatient.mobile}</dd>
                <dt>Type</dt><dd>{viewingPatient.mobile_type ? MOBILE_TYPE_LABELS[viewingPatient.mobile_type] ?? viewingPatient.mobile_type : '—'}</dd>
                <dt>Age</dt><dd>{viewingPatient.age ?? '—'}</dd><dt>Gender</dt><dd>{viewingPatient.gender ?? '—'}</dd>
                <dt>Blood</dt><dd>{viewingPatient.blood_group ?? '—'}</dd><dt>Occupation</dt><dd>{viewingPatient.occupation ?? '—'}</dd>
                <dt>Address</dt><dd>{viewingPatient.address ?? '—'}</dd><dt>Email</dt><dd>{viewingPatient.email ?? '—'}</dd><dt>Due</dt><dd>{viewingPatient.due ?? '—'}</dd>
              </dl>
              <div className="records-modal-footer"><button type="button" className="btn-primary" onClick={() => setViewingPatient(null)}>Close</button></div>
            </div>
          </div>
        </div>
      )}

      {deletingPatient && (
        <div className="records-modal-overlay" onClick={() => setDeletingPatient(null)}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-trash"></i> Delete Patient</h5><button type="button" className="records-modal-close" onClick={() => setDeletingPatient(null)}>×</button></div>
            <div className="records-modal-body">
              <p>Are you sure you want to delete <strong>{deletingPatient.name}</strong>?</p>
              <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => setDeletingPatient(null)}>Cancel</button><button type="button" className="btn-primary records-btn-danger" onClick={handleDeletePatient}>Delete</button></div>
            </div>
          </div>
        </div>
      )}

      {showMedicalHistoryModal && profilePatient && (
        <div className="records-modal-overlay" onClick={() => setShowMedicalHistoryModal(false)}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-file-medical"></i> Medical History</h5><button type="button" className="records-modal-close" onClick={() => setShowMedicalHistoryModal(false)}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveMedicalHistory}>
                <div className="records-form-row"><div className="form-group"><label className="label">BP</label><input className="input" name="bp" defaultValue={medicalHistory.bp} placeholder="/" /></div><div className="form-group"><label className="label">Heart Disease</label><input className="input" name="heartDisease" defaultValue={medicalHistory.heartDisease} /></div></div>
                <div className="records-form-row"><div className="form-group"><label className="label">Diabetic</label><input className="input" name="diabetic" defaultValue={medicalHistory.diabetic} /></div><div className="form-group"><label className="label">Hepatitis</label><input className="input" name="hepatitis" defaultValue={medicalHistory.hepatitis} /></div></div>
                <div className="records-form-row"><div className="form-group"><label className="label">Bleeding Disorder</label><input className="input" name="bleedingDisorder" defaultValue={medicalHistory.bleedingDisorder} /></div><div className="form-group"><label className="label">Allergy</label><input className="input" name="allergy" defaultValue={medicalHistory.allergy} /></div></div>
                <div className="records-form-row"><div className="form-group"><label className="label">Pregnant/Lactating</label><input className="input" name="pregnantLactating" defaultValue={medicalHistory.pregnantLactating} /></div><div className="form-group"><label className="label">Other</label><input className="input" name="other" defaultValue={medicalHistory.other} /></div></div>
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => setShowMedicalHistoryModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showTreatmentPlanModal && profilePatient && (
        <div className="records-modal-overlay" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-clipboard-list"></i> {editingPlan ? 'Edit' : 'Add'} Treatment Plan</h5><button type="button" className="records-modal-close" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveTreatmentPlan} key={editingPlan?.id ?? 'new'}>
                <div className="records-form-row"><div className="form-group"><label className="label">Tooth Number</label><input className="input" name="toothNumber" defaultValue={editingPlan?.toothNumber ?? (selectedTeeth.size > 0 ? String([...selectedTeeth].sort((a, b) => a - b)[0]) : '')} placeholder="e.g. 18" required /></div><div className="form-group"><label className="label">Procedure</label><input className="input" name="procedure" defaultValue={editingPlan?.procedure} placeholder="e.g. Extraction" /></div></div>
                <div className="records-form-row"><div className="form-group"><label className="label">CC</label><input className="input" name="cc" defaultValue={editingPlan?.cc} placeholder="Chief Complaint" /></div><div className="form-group"><label className="label">CF</label><input className="input" name="cf" defaultValue={editingPlan?.cf} placeholder="Clinical Finding" /></div></div>
                <div className="records-form-row"><div className="form-group"><label className="label">Investigation</label><input className="input" name="investigation" defaultValue={editingPlan?.investigation} placeholder="e.g. RVG" /></div><div className="form-group"><label className="label">Status</label><select className="select" name="status" defaultValue={editingPlan?.status ?? 'Not Start'}><option value="Not Start">Not Start</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></div></div>
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>Cancel</button><button type="submit" className="btn-primary">{editingPlan ? 'Update' : 'Add'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEarningModal && (
        <div className="records-modal-overlay" onClick={() => setShowEarningModal(false)}>
          <div className="records-modal records-modal-xl" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-chart-line"></i> Earning Information</h5><button type="button" className="records-modal-close" onClick={() => setShowEarningModal(false)}>×</button></div>
            <div className="records-modal-body">
              <h6 className="records-modal-subtitle">By Year Earning</h6>
              <table className="records-table"><thead><tr><th>#</th>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <th key={m}>{m}</th>)}</tr></thead>
                <tbody>
                  <tr><td><strong>Total Cost</strong></td>{Array(12).fill(0).map((_, i) => <td key={i}>{i < 2 ? (i === 0 ? 75000 : 15000) : 0}</td>)}</tr>
                  <tr><td><strong>Total Income</strong></td>{Array(12).fill(0).map((_, i) => <td key={i}>0</td>)}</tr>
                  <tr><td><strong>Total Due</strong></td>{Array(12).fill(0).map((_, i) => <td key={i}>{i < 2 ? (i === 0 ? 75000 : 15000) : 0}</td>)}</tr>
                </tbody>
              </table>
              <p className="records-modal-note">By Month of February — Total Paid 0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

