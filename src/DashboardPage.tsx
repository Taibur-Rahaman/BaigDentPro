import React, { useState, useEffect, useMemo } from 'react';

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

interface Props {
  onLogout: () => void;
  userName?: string;
}

const STORAGE_KEYS = {
  patients: 'baigdentpro:patients',
  prescriptions: 'baigdentpro:prescriptions',
  appointments: 'baigdentpro:appointments',
  invoices: 'baigdentpro:invoices',
  labOrders: 'baigdentpro:labOrders',
};

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

const DENTAL_PROCEDURES = [
  'Consultation', 'Scaling & Polishing', 'Filling (Composite)', 'Filling (Amalgam)',
  'Root Canal Treatment', 'Extraction', 'Surgical Extraction', 'Crown', 'Bridge',
  'Denture (Complete)', 'Denture (Partial)', 'Implant', 'Teeth Whitening',
  'Orthodontic Consultation', 'Braces Fitting', 'Retainer', 'Night Guard',
  'X-Ray (IOPA)', 'X-Ray (OPG)', 'Fluoride Treatment', 'Sealant Application',
];

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
  'appointments' | 'billing' | 'lab' | 'drugs' | 'sms' | 'settings';

export const DashboardPage: React.FC<Props> = ({ onLogout, userName = 'Doctor' }) => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotice, setShowNotice] = useState<string | null>(null);
  
  // Form states
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '' });
  const [appointmentForm, setAppointmentForm] = useState({ patientId: '', date: '', time: '', type: 'Checkup' });
  const [prescriptionForm, setPrescriptionForm] = useState({ patientId: '', diagnosis: '', advice: '', drugs: [] as DrugItem[] });
  const [invoiceForm, setInvoiceForm] = useState({ patientId: '', items: [] as { description: string; amount: number }[], discount: 0 });
  const [labForm, setLabForm] = useState({ patientId: '', workType: 'Crown', description: '', toothNumber: '', shade: '' });
  
  // Drug form
  const [drugForm, setDrugForm] = useState({ brand: '', dose: '', duration: '', frequency: '1-0-1', beforeFood: false, afterFood: true });
  const [drugSearch, setDrugSearch] = useState('');
  
  // Selected teeth for dental chart
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setPatients(JSON.parse(localStorage.getItem(STORAGE_KEYS.patients) || '[]'));
      setPrescriptions(JSON.parse(localStorage.getItem(STORAGE_KEYS.prescriptions) || '[]'));
      setAppointments(JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || '[]'));
      setInvoices(JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) || '[]'));
      setLabOrders(JSON.parse(localStorage.getItem(STORAGE_KEYS.labOrders) || '[]'));
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

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
  const handleAddPatient = () => {
    if (!patientForm.name || !patientForm.phone) {
      showToast('Name and phone are required');
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
      createdAt: Date.now(),
    };
    savePatients([newPatient, ...patients]);
    setPatientForm({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '' });
    showToast('Patient added successfully');
  };

  const handleAddAppointment = () => {
    if (!appointmentForm.patientId || !appointmentForm.date || !appointmentForm.time) {
      showToast('Please fill all appointment details');
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

  const handleSavePrescription = () => {
    if (!prescriptionForm.patientId || prescriptionForm.drugs.length === 0) {
      showToast('Select patient and add at least one drug');
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

  const handleCreateInvoice = () => {
    if (!invoiceForm.patientId || invoiceForm.items.length === 0) {
      showToast('Select patient and add items');
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

  const handleCreateLabOrder = () => {
    if (!labForm.patientId || !labForm.workType) {
      showToast('Select patient and work type');
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

  const renderPatients = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-users"></i> Patients</h1>
        <div className="header-actions">
          <div className="search-box-inline">
            <i className="fa-solid fa-search"></i>
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="two-column-layout">
        <div className="form-panel">
          <h3><i className="fa-solid fa-user-plus"></i> Add New Patient</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} placeholder="Patient name" />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input type="tel" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input type="text" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} placeholder="Age" />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} placeholder="Email" />
            </div>
            <div className="form-group">
              <label>Blood Group</label>
              <select value={patientForm.bloodGroup} onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}>
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <textarea value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} placeholder="Address" />
            </div>
          </div>
          <button className="btn-primary" onClick={handleAddPatient}>
            <i className="fa-solid fa-plus"></i> Add Patient
          </button>
        </div>

        <div className="list-panel">
          <h3><i className="fa-solid fa-list"></i> Patient List ({filteredPatients.length})</h3>
          <div className="patient-table">
            <table>
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Age/Gender</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id}>
                    <td>{p.regNo}</td>
                    <td>{p.name}</td>
                    <td>{p.phone}</td>
                    <td>{p.age || '-'} / {p.gender || '-'}</td>
                    <td className="action-cell">
                      <button className="btn-icon" title="View" onClick={() => selectPatientForView(p)}><i className="fa-solid fa-eye"></i></button>
                      <button className="btn-icon" title="Prescription" onClick={() => selectPatientForPrescription(p)}><i className="fa-solid fa-prescription"></i></button>
                      <button className="btn-icon" title="Appointment" onClick={() => { setAppointmentForm({ ...appointmentForm, patientId: p.id }); setActiveNav('appointments'); }}><i className="fa-solid fa-calendar-plus"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPatients.length === 0 && <p className="empty-state">No patients found</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatientDetail = () => {
    if (!selectedPatient) return null;
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
            <div className="detail-card">
              <h4><i className="fa-solid fa-info-circle"></i> Basic Info</h4>
              <div className="detail-grid">
                <div><strong>Age:</strong> {selectedPatient.age || '-'}</div>
                <div><strong>Gender:</strong> {selectedPatient.gender || '-'}</div>
                <div><strong>Blood Group:</strong> {selectedPatient.bloodGroup || '-'}</div>
                <div><strong>Address:</strong> {selectedPatient.address || '-'}</div>
              </div>
            </div>

            <div className="detail-card">
              <h4><i className="fa-solid fa-tooth"></i> Dental Chart</h4>
              <div className="dental-chart">
                <div className="chart-section">
                  <h5>Permanent Teeth</h5>
                  <div className="teeth-grid">
                    {TOOTH_CHART.permanent.map((row, idx) => (
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
                <p className="selected-teeth">Selected: {selectedTeeth.join(', ')}</p>
              )}
            </div>

            <div className="detail-card">
              <h4><i className="fa-solid fa-history"></i> Recent Prescriptions</h4>
              {prescriptions.filter(p => p.patientId === selectedPatient.id).length === 0 ? (
                <p className="empty-state">No prescriptions yet</p>
              ) : (
                <div className="prescription-list-mini">
                  {prescriptions.filter(p => p.patientId === selectedPatient.id).slice(0, 5).map(rx => (
                    <div key={rx.id} className="rx-item-mini">
                      <span className="rx-date">{rx.date}</span>
                      <span className="rx-diagnosis">{rx.diagnosis || 'No diagnosis'}</span>
                      <span className="rx-drugs">{rx.drugs.length} drug(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
      </div>

      <div className="two-column-layout">
        <div className="form-panel">
          <h3><i className="fa-solid fa-calendar-plus"></i> Schedule Appointment</h3>
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
                    <button className="btn-icon" title="Send Reminder"><i className="fa-solid fa-bell"></i></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-file-invoice-dollar"></i> Billing & Invoices</h1>
      </div>

      <div className="two-column-layout">
        <div className="form-panel">
          <h3><i className="fa-solid fa-plus"></i> Create Invoice</h3>
          <div className="form-group">
            <label>Patient *</label>
            <select value={invoiceForm.patientId} onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}>
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="invoice-items">
            <h4>Add Items</h4>
            <div className="procedure-buttons">
              {DENTAL_PROCEDURES.slice(0, 12).map(proc => (
                <button key={proc} className="procedure-btn" onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: proc, amount: 500 }] })}>
                  {proc}
                </button>
              ))}
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
          </div>
          <button className="btn-primary" onClick={handleCreateInvoice}>
            <i className="fa-solid fa-file-invoice"></i> Create Invoice
          </button>
        </div>

        <div className="list-panel">
          <h3><i className="fa-solid fa-list"></i> Recent Invoices</h3>
          <div className="invoices-list">
            {invoices.length === 0 ? (
              <p className="empty-state">No invoices yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
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

      <div className="two-column-layout">
        <div className="form-panel">
          <h3><i className="fa-solid fa-plus"></i> Create Lab Order</h3>
          <div className="form-grid">
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
              <input type="text" value={labForm.toothNumber} onChange={(e) => setLabForm({ ...labForm, toothNumber: e.target.value })} placeholder="e.g., 11, 21" />
            </div>
            <div className="form-group">
              <label>Shade</label>
              <input type="text" value={labForm.shade} onChange={(e) => setLabForm({ ...labForm, shade: e.target.value })} placeholder="e.g., A2, B1" />
            </div>
            <div className="form-group full-width">
              <label>Description</label>
              <textarea value={labForm.description} onChange={(e) => setLabForm({ ...labForm, description: e.target.value })} placeholder="Additional details..." />
            </div>
          </div>
          <button className="btn-primary" onClick={handleCreateLabOrder}>
            <i className="fa-solid fa-plus"></i> Create Lab Order
          </button>
        </div>

        <div className="list-panel">
          <h3><i className="fa-solid fa-list"></i> Lab Orders</h3>
          <div className="lab-orders-list">
            {labOrders.length === 0 ? (
              <p className="empty-state">No lab orders yet</p>
            ) : (
              <table>
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
                      <td className="action-cell">
                        <button className="btn-sm" onClick={() => { const newOrders = labOrders.map(o => o.id === order.id ? { ...o, status: 'DELIVERED' } : o); saveLabOrders(newOrders); }}>Mark Delivered</button>
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

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard': return renderDashboard();
      case 'patients': return renderPatients();
      case 'patient-detail': return renderPatientDetail();
      case 'prescription': return renderPrescription();
      case 'prescriptions-list': return renderPrescriptionsList();
      case 'appointments': return renderAppointments();
      case 'billing': return renderBilling();
      case 'lab': return renderLab();
      case 'drugs': return renderDrugs();
      case 'sms': return renderSMS();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className="dashboard-layout">
      {renderSidebar()}
      <main className="dashboard-main">
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
