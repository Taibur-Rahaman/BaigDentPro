import React, { useState, useMemo, useEffect } from 'react';
import api from './api';

const PATIENTS_STORAGE_KEY = 'baigmed:patients';
const MEDICAL_HISTORY_KEY = (patientId: string) => `baigmed:medicalHistory:${patientId}`;
const TREATMENT_PLANS_KEY = (patientId: string) => `baigmed:treatmentPlans:${patientId}`;

export interface SavedPatient {
  id: string;
  patient_id?: string;
  regNo?: string;
  date?: string;
  mobile: string;
  mobile_type?: string;
  name: string;
  age?: string;
  gender?: string;
  blood_group?: string;
  occupation?: string;
  address?: string;
  email?: string;
  tel?: string;
  refBy?: string;
  image?: string;
  due?: string;
  totalPaid?: string;
  createdAt: number;
}

export interface MedicalHistory {
  // Diseases
  bloodPressure?: boolean;
  heartProblems?: boolean;
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
  // Pregnancy
  isPregnant?: boolean;
  isLactating?: boolean;
  // Allergies
  allergyPenicillin?: boolean;
  allergySulphur?: boolean;
  allergyAspirin?: boolean;
  allergyLocalAnaesthesia?: boolean;
  allergyOther?: string;
  // Taking Drugs
  takingAspirinBloodThinner?: boolean;
  takingAntihypertensive?: boolean;
  takingInhaler?: boolean;
  takingOther?: string;
  // Bad Habits
  habitSmoking?: boolean;
  habitBetelLeaf?: boolean;
  habitAlcohol?: boolean;
  habitOther?: string;
  // Notes
  details?: string;
}

export interface TreatmentPlan {
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

export interface TreatmentRecord {
  id: string;
  date: string;
  treatmentDone: string;
  cost: string;
  paid: string;
  due: string;
  doctorSignature?: string;
}

export interface PatientConsent {
  patientId: string;
  consentText: string;
  signatureName: string;
  signatureDate: string;
  agreed: boolean;
}

const TREATMENT_RECORDS_KEY = (patientId: string) => `baigmed:treatmentRecords:${patientId}`;
const CONSENT_KEY = (patientId: string) => `baigmed:consent:${patientId}`;

const DIAGNOSIS_OPTIONS = [
  'Examination', 'X-Ray/RVG', 'Calculus', 'Caries', 'Deep Caries',
  'BDR/BDC/Fracture', 'Missing', 'Mobility', 'Mucosal Lesion'
];

const TREATMENT_OPTIONS = [
  'Consultation', 'Scaling', 'Filling', 'Root Canal',
  'Extraction/Surgical Ext', 'Partial/Complete Denture/Implant',
  'Implant', 'Fixed Orthodontics'
];

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

const PRODUCT_CATEGORIES = [
  { id: 'TOOTHBRUSH', name: 'Toothbrush', icon: '🪥' },
  { id: 'TOOTHPASTE', name: 'Toothpaste', icon: '🦷' },
  { id: 'MOUTHWASH', name: 'Mouthwash', icon: '🧴' },
  { id: 'DENTAL_FLOSS', name: 'Dental Floss', icon: '🧵' },
  { id: 'WHITENING', name: 'Whitening Kits', icon: '✨' },
  { id: 'DENTAL_TOOLS', name: 'Dental Tools', icon: '🔧' },
  { id: 'CLINIC_SUPPLIES', name: 'Clinic Supplies', icon: '🏥' },
  { id: 'ORTHODONTIC', name: 'Orthodontic', icon: '😁' },
  { id: 'KIDS_DENTAL', name: 'Kids Dental', icon: '👶' },
  { id: 'OTHER', name: 'Other', icon: '📦' },
];

const ORDER_STATUSES = [
  { id: 'PENDING', name: 'Pending', color: '#f59e0b' },
  { id: 'CONFIRMED', name: 'Confirmed', color: '#3b82f6' },
  { id: 'PROCESSING', name: 'Processing', color: '#8b5cf6' },
  { id: 'SHIPPED', name: 'Shipped', color: '#0284c7' },
  { id: 'DELIVERED', name: 'Delivered', color: '#22c55e' },
  { id: 'CANCELLED', name: 'Cancelled', color: '#ef4444' },
  { id: 'RETURNED', name: 'Returned', color: '#64748b' },
];

interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  category: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  sku?: string;
  images: string[];
  createdAt: string;
}

interface ShopOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  shippingCity: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

interface ShopStats {
  products: { total: number; active: number; lowStock: number };
  orders: { total: number; pending: number; today: number };
  revenue: { total: number; today: number };
}

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

function loadTreatmentRecords(patientId: string): TreatmentRecord[] {
  try {
    const raw = localStorage.getItem(TREATMENT_RECORDS_KEY(patientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTreatmentRecords(patientId: string, records: TreatmentRecord[]) {
  localStorage.setItem(TREATMENT_RECORDS_KEY(patientId), JSON.stringify(records));
}

function loadConsent(patientId: string): PatientConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY(patientId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConsent(patientId: string, consent: PatientConsent) {
  localStorage.setItem(CONSENT_KEY(patientId), JSON.stringify(consent));
}

function generateRegNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${y}-${m}-${count}`;
}

export const RecordsPage: React.FC<Props> = ({ onBackToLogin, userName = 'User' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [recordsView, setRecordsView] = useState<'home' | 'inventory' | 'patients' | 'appointment' | 'subscription' | 'patient-profile' | 'shop'>('home');
  
  // Shop state
  const [shopTab, setShopTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [shopStats, setShopStats] = useState<ShopStats | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ShopOrder | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
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
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [consent, setConsent] = useState<PatientConsent | null>(null);
  const [showTreatmentRecordModal, setShowTreatmentRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TreatmentRecord | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'history' | 'treatment' | 'ledger' | 'consent'>('info');
  const [showPrintView, setShowPrintView] = useState(false);
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

  // Shop functions
  const loadShopData = async () => {
    setShopLoading(true);
    try {
      const [statsRes, productsRes, ordersRes] = await Promise.all([
        api.shopAdmin.stats(),
        api.shopAdmin.products({ search: productSearchQuery || undefined }),
        api.shopAdmin.orders({ status: orderStatusFilter || undefined }),
      ]);
      setShopStats(statsRes);
      setShopProducts(productsRes.products);
      setShopOrders(ordersRes.orders);
    } catch (error) {
      console.log('Shop API not available, using demo data');
      setShopStats({
        products: { total: 24, active: 20, lowStock: 3 },
        orders: { total: 156, pending: 8, today: 3 },
        revenue: { total: 125000, today: 4500 },
      });
      setShopProducts([
        { id: '1', name: 'Oral-B Electric Toothbrush Pro', slug: 'oral-b-pro', description: 'Advanced electric toothbrush with 3D cleaning', price: 2500, category: 'TOOTHBRUSH', stock: 25, isActive: true, isFeatured: true, sku: 'TB-001', images: [], createdAt: new Date().toISOString() },
        { id: '2', name: 'Colgate Total Toothpaste 150g', slug: 'colgate-total', description: '12-hour protection', price: 180, category: 'TOOTHPASTE', stock: 100, isActive: true, isFeatured: false, sku: 'TP-001', images: [], createdAt: new Date().toISOString() },
        { id: '3', name: 'Listerine Mouthwash 500ml', slug: 'listerine-500', description: 'Antiseptic mouthwash', price: 350, category: 'MOUTHWASH', stock: 3, isActive: true, isFeatured: true, sku: 'MW-001', images: [], createdAt: new Date().toISOString() },
        { id: '4', name: 'Crest Whitening Strips', slug: 'crest-white', description: 'Professional whitening at home', price: 3500, category: 'WHITENING', stock: 15, isActive: true, isFeatured: true, sku: 'WK-001', images: [], createdAt: new Date().toISOString() },
        { id: '5', name: 'Dental Floss Premium', slug: 'floss-premium', description: 'Waxed dental floss 50m', price: 120, category: 'DENTAL_FLOSS', stock: 50, isActive: true, isFeatured: false, sku: 'DF-001', images: [], createdAt: new Date().toISOString() },
      ]);
      setShopOrders([
        { id: '1', orderNo: 'ORD202603001', customerName: 'Ahmed Rahman', customerPhone: '01711234567', shippingAddress: 'House 12, Road 5, Dhanmondi', shippingCity: 'Dhaka', total: 2850, status: 'PENDING', paymentMethod: 'COD', createdAt: new Date().toISOString(), items: [{ name: 'Oral-B Electric Toothbrush', quantity: 1, price: 2500 }, { name: 'Listerine Mouthwash', quantity: 1, price: 350 }] },
        { id: '2', orderNo: 'ORD202603002', customerName: 'Fatima Begum', customerPhone: '01812345678', shippingAddress: 'Flat 5B, Green Tower, Gulshan', shippingCity: 'Dhaka', total: 3680, status: 'CONFIRMED', paymentMethod: 'ONLINE', createdAt: new Date(Date.now() - 86400000).toISOString(), items: [{ name: 'Crest Whitening Strips', quantity: 1, price: 3500 }, { name: 'Colgate Total', quantity: 1, price: 180 }] },
        { id: '3', orderNo: 'ORD202603003', customerName: 'Karim Miah', customerPhone: '01912345678', shippingAddress: 'Shop 22, Newmarket', shippingCity: 'Chittagong', total: 720, status: 'DELIVERED', paymentMethod: 'COD', createdAt: new Date(Date.now() - 172800000).toISOString(), items: [{ name: 'Colgate Total', quantity: 4, price: 180 }] },
      ]);
    } finally {
      setShopLoading(false);
    }
  };

  useEffect(() => {
    if (recordsView === 'shop') {
      loadShopData();
    }
  }, [recordsView, productSearchQuery, orderStatusFilter]);

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const productData = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? ''),
      price: parseFloat(String(fd.get('price') ?? '0')),
      comparePrice: fd.get('comparePrice') ? parseFloat(String(fd.get('comparePrice'))) : undefined,
      category: String(fd.get('category') ?? 'OTHER'),
      stock: parseInt(String(fd.get('stock') ?? '0')),
      sku: String(fd.get('sku') ?? ''),
      isFeatured: fd.get('isFeatured') === 'on',
    };

    try {
      if (editingProduct) {
        await api.shopAdmin.updateProduct(editingProduct.id, productData);
        showNotice('Product updated successfully!');
      } else {
        await api.shopAdmin.createProduct(productData);
        showNotice('Product created successfully!');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      loadShopData();
    } catch (error: any) {
      showNotice(error.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (product: ShopProduct) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.shopAdmin.deleteProduct(product.id);
      showNotice('Product deleted!');
      loadShopData();
    } catch (error: any) {
      showNotice(error.message || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (order: ShopOrder, newStatus: string) => {
    try {
      await api.shopAdmin.updateOrderStatus(order.id, newStatus);
      showNotice(`Order ${order.orderNo} updated to ${newStatus}`);
      loadShopData();
    } catch (error: any) {
      showNotice(error.message || 'Failed to update order');
    }
  };

  const getCategoryName = (categoryId: string) => {
    return PRODUCT_CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    return PRODUCT_CATEGORIES.find(c => c.id === categoryId)?.icon || '📦';
  };

  const getStatusColor = (status: string) => {
    return ORDER_STATUSES.find(s => s.id === status)?.color || '#64748b';
  };

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
      bloodPressure: fd.get('bloodPressure') === 'on',
      heartProblems: fd.get('heartProblems') === 'on',
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
      otherDiseases: String(fd.get('otherDiseases') ?? ''),
      isPregnant: fd.get('isPregnant') === 'on',
      isLactating: fd.get('isLactating') === 'on',
      allergyPenicillin: fd.get('allergyPenicillin') === 'on',
      allergySulphur: fd.get('allergySulphur') === 'on',
      allergyAspirin: fd.get('allergyAspirin') === 'on',
      allergyLocalAnaesthesia: fd.get('allergyLocalAnaesthesia') === 'on',
      allergyOther: String(fd.get('allergyOther') ?? ''),
      takingAspirinBloodThinner: fd.get('takingAspirinBloodThinner') === 'on',
      takingAntihypertensive: fd.get('takingAntihypertensive') === 'on',
      takingInhaler: fd.get('takingInhaler') === 'on',
      takingOther: String(fd.get('takingOther') ?? ''),
      habitSmoking: fd.get('habitSmoking') === 'on',
      habitBetelLeaf: fd.get('habitBetelLeaf') === 'on',
      habitAlcohol: fd.get('habitAlcohol') === 'on',
      habitOther: String(fd.get('habitOther') ?? ''),
      details: String(fd.get('details') ?? ''),
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
      toothNumber: String(fd.get('toothNumber') ?? ''),
      diagnosis: String(fd.get('diagnosis') ?? ''),
      procedure: String(fd.get('procedure') ?? ''),
      cost: String(fd.get('cost') ?? '0'),
      cc: String(fd.get('cc') ?? ''),
      cf: String(fd.get('cf') ?? ''),
      investigation: String(fd.get('investigation') ?? ''),
      status: String(fd.get('status') ?? 'Not Start'),
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

  const handleSaveTreatmentRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profilePatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const record: TreatmentRecord = {
      id: editingRecord?.id ?? crypto.randomUUID(),
      date: String(fd.get('date') ?? new Date().toISOString().split('T')[0]),
      treatmentDone: String(fd.get('treatmentDone') ?? ''),
      cost: String(fd.get('cost') ?? '0'),
      paid: String(fd.get('paid') ?? '0'),
      due: String(fd.get('due') ?? '0'),
      doctorSignature: String(fd.get('doctorSignature') ?? ''),
    };
    setTreatmentRecords(prev => {
      const next = editingRecord ? prev.map(r => r.id === record.id ? record : r) : [...prev, record];
      saveTreatmentRecords(profilePatient.id, next);
      return next;
    });
    setShowTreatmentRecordModal(false);
    setEditingRecord(null);
    showNotice(editingRecord ? 'Record updated!' : 'Record added!');
  };

  const handleDeleteTreatmentRecord = (record: TreatmentRecord) => {
    if (!profilePatient) return;
    setTreatmentRecords(prev => {
      const next = prev.filter(r => r.id !== record.id);
      saveTreatmentRecords(profilePatient.id, next);
      return next;
    });
    showNotice('Record deleted!');
  };

  const handleSaveConsent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profilePatient) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const newConsent: PatientConsent = {
      patientId: profilePatient.id,
      consentText: 'I do hereby agree to undergo necessary treatment of myself/my dependent. The procedure & the potential complications (if any) were explained to me.',
      signatureName: String(fd.get('signatureName') ?? ''),
      signatureDate: String(fd.get('signatureDate') ?? new Date().toISOString().split('T')[0]),
      agreed: true,
    };
    setConsent(newConsent);
    saveConsent(profilePatient.id, newConsent);
    setShowConsentModal(false);
    showNotice('Consent saved!');
  };

  const calculateTotals = () => {
    const totalCost = treatmentRecords.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0);
    const totalPaid = treatmentRecords.reduce((sum, r) => sum + parseFloat(r.paid || '0'), 0);
    const totalDue = totalCost - totalPaid;
    return { totalCost, totalPaid, totalDue };
  };

  const printPatientRecord = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
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
            <button type="button" className={`records-nav-link ${recordsView === 'shop' ? 'active' : ''}`} onClick={() => setRecordsView('shop')}>
              <i className="fa-solid fa-store"></i> Shop
            </button>
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
                    {medicalHistory.bloodPressure && <span className="history-tag">BP</span>}
                    {medicalHistory.heartProblems && <span className="history-tag">Heart</span>}
                    {medicalHistory.diabetes && <span className="history-tag">Diabetic</span>}
                    {medicalHistory.asthma && <span className="history-tag">Asthma</span>}
                    {medicalHistory.hepatitis && <span className="history-tag">Hepatitis</span>}
                    {medicalHistory.bleedingDisorder && <span className="history-tag">Bleeding</span>}
                    {medicalHistory.kidneyDiseases && <span className="history-tag">Kidney</span>}
                    {medicalHistory.isPregnant && <span className="history-tag">Pregnant</span>}
                    {medicalHistory.isLactating && <span className="history-tag">Lactating</span>}
                    {medicalHistory.allergyPenicillin && <span className="history-tag allergy">Penicillin Allergy</span>}
                    {medicalHistory.allergyLocalAnaesthesia && <span className="history-tag allergy">LA Allergy</span>}
                    {medicalHistory.habitSmoking && <span className="history-tag habit">Smoking</span>}
                    {medicalHistory.habitAlcohol && <span className="history-tag habit">Alcohol</span>}
                    {medicalHistory.habitBetelLeaf && <span className="history-tag habit">Betel</span>}
                    {!Object.values(medicalHistory).some(v => v) && <p className="records-empty-sm">No history recorded</p>}
                  </div>
                  <button type="button" className="btn-primary btn-sm" onClick={() => setShowMedicalHistoryModal(true)}><i className="fa-solid fa-edit"></i> Add/Edit</button>
                </div>
                <div className="records-info-box">
                  <h6 className="records-section-title">Treatment Cost</h6>
                  <div className="cost-summary">
                    <p><span>Total Cost:</span> <strong>{calculateTotals().totalCost.toLocaleString()} TK</strong></p>
                    <p><span>Total Paid:</span> <strong className="text-success">{calculateTotals().totalPaid.toLocaleString()} TK</strong></p>
                    <p><span>Total Due:</span> <strong className="text-danger">{calculateTotals().totalDue.toLocaleString()} TK</strong></p>
                  </div>
                </div>
                <div className="records-info-box">
                  <h6 className="records-section-title">Actions</h6>
                  <div className="profile-quick-actions">
                    <button type="button" className="btn-primary btn-sm full" onClick={() => { setEditingRecord(null); setShowTreatmentRecordModal(true); }}><i className="fa-solid fa-plus"></i> Add Payment</button>
                    <button type="button" className="btn-primary btn-sm full" onClick={() => setShowConsentModal(true)}><i className="fa-solid fa-file-signature"></i> Consent Form</button>
                    <button type="button" className="btn-primary btn-sm full" onClick={printPatientRecord}><i className="fa-solid fa-print"></i> Print Record</button>
                  </div>
                </div>
              </aside>
            </div>
            <section className="treatment-plans-section">
              <div className="profile-tabs">
                <button type="button" className={`profile-tab ${profileTab === 'treatment' || profileTab === 'info' ? 'active' : ''}`} onClick={() => setProfileTab('treatment')}>Treatment Plan & Cost</button>
                <button type="button" className={`profile-tab ${profileTab === 'ledger' ? 'active' : ''}`} onClick={() => setProfileTab('ledger')}>Payment Ledger</button>
                <button type="button" className={`profile-tab ${profileTab === 'consent' ? 'active' : ''}`} onClick={() => setProfileTab('consent')}>Consent</button>
              </div>

              {(profileTab === 'treatment' || profileTab === 'info') && (
                <>
                  <h2 className="treatment-plans-banner">Treatment Plan & Cost for {profilePatient.name}</h2>
                  <div className="treatment-cost-table-wrap">
                    <table className="treatment-cost-table">
                      <thead>
                        <tr>
                          <th>Tooth</th>
                          <th>Diagnosis</th>
                          <th>Treatment</th>
                          <th>Cost (TK)</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {treatmentPlans.length === 0 ? (
                          <tr><td colSpan={6} className="text-center">No treatment plans yet</td></tr>
                        ) : (
                          treatmentPlans.map(plan => (
                            <tr key={plan.id}>
                              <td><strong>{plan.toothNumber}</strong></td>
                              <td>{plan.diagnosis || '—'}</td>
                              <td>{plan.procedure || '—'}</td>
                              <td>{plan.cost || '0'}</td>
                              <td><span className={`status-badge ${plan.status.toLowerCase().replace(' ', '-')}`}>{plan.status}</span></td>
                              <td>
                                <button type="button" className="btn-icon" onClick={() => { setEditingPlan(plan); setShowTreatmentPlanModal(true); }} title="Edit"><i className="fa-solid fa-edit"></i></button>
                                <button type="button" className="btn-icon danger" onClick={() => handleDeleteTreatmentPlan(plan)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}><strong>Total</strong></td>
                          <td><strong>{treatmentPlans.reduce((sum, p) => sum + parseFloat(p.cost || '0'), 0).toLocaleString()} TK</strong></td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="treatment-plans-add">
                    <button type="button" className="btn-primary" onClick={() => { setEditingPlan(null); setShowTreatmentPlanModal(true); }}><i className="fa-solid fa-plus"></i> Add Treatment</button>
                  </div>
                </>
              )}

              {profileTab === 'ledger' && (
                <>
                  <h2 className="treatment-plans-banner">Payment Ledger for {profilePatient.name}</h2>
                  <div className="treatment-cost-table-wrap">
                    <table className="treatment-cost-table ledger-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Treatment Done</th>
                          <th>Cost (TK)</th>
                          <th>Paid (TK)</th>
                          <th>Due (TK)</th>
                          <th>Doctor</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {treatmentRecords.length === 0 ? (
                          <tr><td colSpan={7} className="text-center">No records yet</td></tr>
                        ) : (
                          treatmentRecords.map(record => (
                            <tr key={record.id}>
                              <td>{record.date}</td>
                              <td>{record.treatmentDone}</td>
                              <td>{record.cost}</td>
                              <td className="text-success">{record.paid}</td>
                              <td className="text-danger">{record.due}</td>
                              <td>{record.doctorSignature || '—'}</td>
                              <td>
                                <button type="button" className="btn-icon" onClick={() => { setEditingRecord(record); setShowTreatmentRecordModal(true); }} title="Edit"><i className="fa-solid fa-edit"></i></button>
                                <button type="button" className="btn-icon danger" onClick={() => handleDeleteTreatmentRecord(record)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2}><strong>Total</strong></td>
                          <td><strong>{calculateTotals().totalCost.toLocaleString()}</strong></td>
                          <td className="text-success"><strong>{calculateTotals().totalPaid.toLocaleString()}</strong></td>
                          <td className="text-danger"><strong>{calculateTotals().totalDue.toLocaleString()}</strong></td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="treatment-plans-add">
                    <button type="button" className="btn-primary" onClick={() => { setEditingRecord(null); setShowTreatmentRecordModal(true); }}><i className="fa-solid fa-plus"></i> Add Record</button>
                  </div>
                </>
              )}

              {profileTab === 'consent' && (
                <>
                  <h2 className="treatment-plans-banner">Patient Consent</h2>
                  <div className="consent-display">
                    {consent?.agreed ? (
                      <div className="consent-signed">
                        <p><i className="fa-solid fa-check-circle text-success"></i> Consent has been signed</p>
                        <div className="consent-details">
                          <p><strong>Name:</strong> {consent.signatureName}</p>
                          <p><strong>Date:</strong> {consent.signatureDate}</p>
                          <p className="consent-text-display">{consent.consentText}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="consent-unsigned">
                        <p><i className="fa-solid fa-exclamation-circle text-warning"></i> Consent not yet signed</p>
                        <button type="button" className="btn-primary" onClick={() => setShowConsentModal(true)}><i className="fa-solid fa-file-signature"></i> Sign Consent Form</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* Legacy treatment plan cards - keeping for backwards compatibility */}
            <section className="treatment-plans-section" style={{ display: 'none' }}>
              <h2 className="treatment-plans-banner">Treatment Plans For {profilePatient.name}</h2>
              <div className="treatment-plans-grid">
                {treatmentPlans.length === 0 ? (
                  <p className="records-empty"><i className="fa-solid fa-clipboard-list"></i> No treatment plans yet.</p>
                ) : (
                  treatmentPlans.map(plan => (
                    <div key={plan.id} className="treatment-plan-card">
                      <div className="treatment-plan-card-header"><span className="treatment-plan-tooth"><i className="fa-solid fa-tooth"></i> Tooth No: {plan.toothNumber}</span></div>
                      <div className="treatment-plan-body">
                        <p><strong>{plan.procedure || '—'}</strong> - {plan.cost || '0'} TK</p>
                        <p><strong>Diagnosis:</strong> {plan.diagnosis || '—'}</p>
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
                            <button type="button" className="records-table-btn records-table-btn-view" onClick={() => { setProfilePatient(p); setMedicalHistory(loadMedicalHistory(p.id)); setTreatmentPlans(loadTreatmentPlans(p.id)); setTreatmentRecords(loadTreatmentRecords(p.id)); setConsent(loadConsent(p.id)); setProfileTab('info'); setRecordsView('patient-profile'); }}><i className="fa-solid fa-eye"></i></button>
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
          {recordsView === 'shop' && (
            <div className="records-view-panel shop-management">
              <div className="shop-header-row">
                <h6 className="records-section-title"><i className="fa-solid fa-store"></i> Shop Management</h6>
                <div className="shop-tabs">
                  <button type="button" className={`shop-tab ${shopTab === 'overview' ? 'active' : ''}`} onClick={() => setShopTab('overview')}>
                    <i className="fa-solid fa-chart-pie"></i> Overview
                  </button>
                  <button type="button" className={`shop-tab ${shopTab === 'products' ? 'active' : ''}`} onClick={() => setShopTab('products')}>
                    <i className="fa-solid fa-box"></i> Products
                  </button>
                  <button type="button" className={`shop-tab ${shopTab === 'orders' ? 'active' : ''}`} onClick={() => setShopTab('orders')}>
                    <i className="fa-solid fa-shopping-bag"></i> Orders
                  </button>
                </div>
              </div>

              {shopLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '16px' }}></i>
                  <p>Loading shop data...</p>
                </div>
              ) : (
                <>
                  {shopTab === 'overview' && shopStats && (
                    <div className="shop-overview">
                      <div className="shop-stats-grid">
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#0d9488' }}><i className="fa-solid fa-box"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.products.total}</span>
                            <span className="shop-stat-label">Total Products</span>
                          </div>
                        </div>
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#22c55e' }}><i className="fa-solid fa-check-circle"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.products.active}</span>
                            <span className="shop-stat-label">Active Products</span>
                          </div>
                        </div>
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#f59e0b' }}><i className="fa-solid fa-exclamation-triangle"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.products.lowStock}</span>
                            <span className="shop-stat-label">Low Stock</span>
                          </div>
                        </div>
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#3b82f6' }}><i className="fa-solid fa-shopping-cart"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.orders.total}</span>
                            <span className="shop-stat-label">Total Orders</span>
                          </div>
                        </div>
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#ef4444' }}><i className="fa-solid fa-clock"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.orders.pending}</span>
                            <span className="shop-stat-label">Pending Orders</span>
                          </div>
                        </div>
                        <div className="shop-stat-card">
                          <div className="shop-stat-icon" style={{ background: '#8b5cf6' }}><i className="fa-solid fa-calendar-day"></i></div>
                          <div className="shop-stat-info">
                            <span className="shop-stat-value">{shopStats.orders.today}</span>
                            <span className="shop-stat-label">Today's Orders</span>
                          </div>
                        </div>
                      </div>
                      <div className="shop-revenue-cards">
                        <div className="shop-revenue-card">
                          <i className="fa-solid fa-coins"></i>
                          <div className="revenue-info">
                            <span className="revenue-value">৳{shopStats.revenue.total.toLocaleString()}</span>
                            <span className="revenue-label">Total Revenue</span>
                          </div>
                        </div>
                        <div className="shop-revenue-card today">
                          <i className="fa-solid fa-chart-line"></i>
                          <div className="revenue-info">
                            <span className="revenue-value">৳{shopStats.revenue.today.toLocaleString()}</span>
                            <span className="revenue-label">Today's Revenue</span>
                          </div>
                        </div>
                      </div>
                      <div className="shop-quick-actions">
                        <button type="button" className="btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
                          <i className="fa-solid fa-plus"></i> Add New Product
                        </button>
                        <button type="button" className="btn-primary" onClick={() => setShopTab('orders')}>
                          <i className="fa-solid fa-list"></i> View All Orders
                        </button>
                        <a href="/" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
                          <i className="fa-solid fa-external-link"></i> View Public Shop
                        </a>
                      </div>
                    </div>
                  )}

                  {shopTab === 'products' && (
                    <div className="shop-products">
                      <div className="shop-toolbar">
                        <div className="records-search-box">
                          <input 
                            className="input" 
                            type="text" 
                            placeholder="Search products..." 
                            value={productSearchQuery} 
                            onChange={e => setProductSearchQuery(e.target.value)} 
                          />
                        </div>
                        <button type="button" className="btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
                          <i className="fa-solid fa-plus"></i> Add Product
                        </button>
                      </div>
                      {shopProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.3 }}></i>
                          <p>No products found. Add your first product!</p>
                        </div>
                      ) : (
                        <div className="shop-products-table-wrap">
                          <table className="records-patient-table shop-products-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shopProducts.map(product => (
                                <tr key={product.id}>
                                  <td>
                                    <div className="product-cell">
                                      <span className="product-icon">{getCategoryIcon(product.category)}</span>
                                      <div className="product-info">
                                        <strong>{product.name}</strong>
                                        {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
                                      </div>
                                    </div>
                                  </td>
                                  <td>{getCategoryName(product.category)}</td>
                                  <td>
                                    <span className="product-price">৳{product.price}</span>
                                    {product.comparePrice && <span className="product-compare-price">৳{product.comparePrice}</span>}
                                  </td>
                                  <td>
                                    <span className={`stock-badge ${product.stock <= 5 ? 'low' : ''}`}>
                                      {product.stock}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                                      {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {product.isFeatured && <span className="featured-badge">Featured</span>}
                                  </td>
                                  <td>
                                    <button type="button" className="records-table-btn records-table-btn-edit" onClick={() => { setEditingProduct(product); setShowProductModal(true); }}>
                                      <i className="fa-solid fa-edit"></i>
                                    </button>
                                    <button type="button" className="records-table-btn records-table-btn-delete" onClick={() => handleDeleteProduct(product)}>
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {shopTab === 'orders' && (
                    <div className="shop-orders">
                      <div className="shop-toolbar">
                        <select className="select" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} style={{ maxWidth: '200px' }}>
                          <option value="">All Orders</option>
                          {ORDER_STATUSES.map(status => (
                            <option key={status.id} value={status.id}>{status.name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn-ghost" onClick={loadShopData}>
                          <i className="fa-solid fa-refresh"></i> Refresh
                        </button>
                      </div>
                      {shopOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-shopping-bag" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.3 }}></i>
                          <p>No orders found.</p>
                        </div>
                      ) : (
                        <div className="shop-orders-table-wrap">
                          <table className="records-patient-table shop-orders-table">
                            <thead>
                              <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shopOrders.map(order => (
                                <tr key={order.id}>
                                  <td><strong>{order.orderNo}</strong></td>
                                  <td>
                                    <div className="customer-cell">
                                      <span className="customer-name">{order.customerName}</span>
                                      <span className="customer-phone">{order.customerPhone}</span>
                                    </div>
                                  </td>
                                  <td>{order.items.length} item(s)</td>
                                  <td><strong>৳{order.total.toLocaleString()}</strong></td>
                                  <td>
                                    <select 
                                      className="select order-status-select" 
                                      value={order.status} 
                                      onChange={e => handleUpdateOrderStatus(order, e.target.value)}
                                      style={{ borderColor: getStatusColor(order.status), color: getStatusColor(order.status) }}
                                    >
                                      {ORDER_STATUSES.map(status => (
                                        <option key={status.id} value={status.id}>{status.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                  <td>
                                    <button type="button" className="records-table-btn records-table-btn-view" onClick={() => { setViewingOrder(order); setShowOrderModal(true); }}>
                                      <i className="fa-solid fa-eye"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
          <div className="records-modal records-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-file-medical"></i> Medical History</h5><button type="button" className="records-modal-close" onClick={() => setShowMedicalHistoryModal(false)}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveMedicalHistory}>
                <div className="medical-history-grid">
                  <div className="medical-section">
                    <h6 className="medical-section-title">Diseases Like</h6>
                    <label className="checkbox-label"><input type="checkbox" name="bloodPressure" defaultChecked={medicalHistory.bloodPressure} /> Blood Pressure (High/Low)</label>
                    <label className="checkbox-label"><input type="checkbox" name="heartProblems" defaultChecked={medicalHistory.heartProblems} /> Heart Problems (Rheumatic Fever)</label>
                    <label className="checkbox-label"><input type="checkbox" name="diabetes" defaultChecked={medicalHistory.diabetes} /> Diabetes</label>
                    <label className="checkbox-label"><input type="checkbox" name="pepticUlcer" defaultChecked={medicalHistory.pepticUlcer} /> Peptic Ulcer / Acidity</label>
                    <label className="checkbox-label"><input type="checkbox" name="jaundice" defaultChecked={medicalHistory.jaundice} /> Jaundice / Liver Diseases</label>
                    <label className="checkbox-label"><input type="checkbox" name="asthma" defaultChecked={medicalHistory.asthma} /> Asthma</label>
                    <label className="checkbox-label"><input type="checkbox" name="tuberculosis" defaultChecked={medicalHistory.tuberculosis} /> Tuberculosis</label>
                    <label className="checkbox-label"><input type="checkbox" name="kidneyDiseases" defaultChecked={medicalHistory.kidneyDiseases} /> Kidney Diseases</label>
                    <label className="checkbox-label"><input type="checkbox" name="aids" defaultChecked={medicalHistory.aids} /> AIDS / HIV</label>
                    <label className="checkbox-label"><input type="checkbox" name="thyroid" defaultChecked={medicalHistory.thyroid} /> Thyroid</label>
                    <label className="checkbox-label"><input type="checkbox" name="hepatitis" defaultChecked={medicalHistory.hepatitis} /> Hepatitis</label>
                    <label className="checkbox-label"><input type="checkbox" name="stroke" defaultChecked={medicalHistory.stroke} /> Stroke</label>
                    <label className="checkbox-label"><input type="checkbox" name="bleedingDisorder" defaultChecked={medicalHistory.bleedingDisorder} /> Bleeding Disorder</label>
                    <div className="form-group mt-2"><label className="label">Other Problems</label><input className="input" name="otherDiseases" defaultValue={medicalHistory.otherDiseases} placeholder="Please specify" /></div>
                  </div>
                  <div className="medical-section">
                    <h6 className="medical-section-title">If Female</h6>
                    <label className="checkbox-label"><input type="checkbox" name="isPregnant" defaultChecked={medicalHistory.isPregnant} /> Pregnant</label>
                    <label className="checkbox-label"><input type="checkbox" name="isLactating" defaultChecked={medicalHistory.isLactating} /> Lactating Mother</label>
                    
                    <h6 className="medical-section-title mt-3">Allergic To</h6>
                    <label className="checkbox-label"><input type="checkbox" name="allergyPenicillin" defaultChecked={medicalHistory.allergyPenicillin} /> Penicillin</label>
                    <label className="checkbox-label"><input type="checkbox" name="allergySulphur" defaultChecked={medicalHistory.allergySulphur} /> Sulphur</label>
                    <label className="checkbox-label"><input type="checkbox" name="allergyAspirin" defaultChecked={medicalHistory.allergyAspirin} /> Aspirin</label>
                    <label className="checkbox-label"><input type="checkbox" name="allergyLocalAnaesthesia" defaultChecked={medicalHistory.allergyLocalAnaesthesia} /> Local Anaesthesia</label>
                    <div className="form-group mt-2"><label className="label">Other Allergies</label><input className="input" name="allergyOther" defaultValue={medicalHistory.allergyOther} placeholder="Please specify" /></div>
                  </div>
                  <div className="medical-section">
                    <h6 className="medical-section-title">Taking Drug</h6>
                    <label className="checkbox-label"><input type="checkbox" name="takingAspirinBloodThinner" defaultChecked={medicalHistory.takingAspirinBloodThinner} /> Aspirin / Blood Thinner</label>
                    <label className="checkbox-label"><input type="checkbox" name="takingAntihypertensive" defaultChecked={medicalHistory.takingAntihypertensive} /> Antihypertensive</label>
                    <label className="checkbox-label"><input type="checkbox" name="takingInhaler" defaultChecked={medicalHistory.takingInhaler} /> Inhaler</label>
                    <div className="form-group mt-2"><label className="label">Other Drugs</label><input className="input" name="takingOther" defaultValue={medicalHistory.takingOther} placeholder="Please specify" /></div>
                    
                    <h6 className="medical-section-title mt-3">Bad Habits</h6>
                    <label className="checkbox-label"><input type="checkbox" name="habitSmoking" defaultChecked={medicalHistory.habitSmoking} /> Smoking</label>
                    <label className="checkbox-label"><input type="checkbox" name="habitBetelLeaf" defaultChecked={medicalHistory.habitBetelLeaf} /> Chewing Betel Leaf/Nut</label>
                    <label className="checkbox-label"><input type="checkbox" name="habitAlcohol" defaultChecked={medicalHistory.habitAlcohol} /> Alcohol</label>
                    <div className="form-group mt-2"><label className="label">Other Habits</label><input className="input" name="habitOther" defaultValue={medicalHistory.habitOther} placeholder="Please specify" /></div>
                  </div>
                </div>
                <div className="form-group mt-3"><label className="label">Additional Details / Notes</label><textarea className="input" name="details" rows={3} defaultValue={medicalHistory.details} placeholder="Any additional medical details..." /></div>
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
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Tooth Number</label><input className="input" name="toothNumber" defaultValue={editingPlan?.toothNumber ?? (selectedTeeth.size > 0 ? String([...selectedTeeth].sort((a, b) => a - b)[0]) : '')} placeholder="e.g. 18" required /></div>
                  <div className="form-group"><label className="label">Diagnosis</label>
                    <select className="select" name="diagnosis" defaultValue={editingPlan?.diagnosis}>
                      <option value="">Select Diagnosis</option>
                      {DIAGNOSIS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Treatment/Procedure</label>
                    <select className="select" name="procedure" defaultValue={editingPlan?.procedure}>
                      <option value="">Select Treatment</option>
                      {TREATMENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="label">Cost (TK)</label><input type="number" className="input" name="cost" defaultValue={editingPlan?.cost} placeholder="0" /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Chief Complaint (CC)</label><input className="input" name="cc" defaultValue={editingPlan?.cc} placeholder="e.g. Pain, Swelling" /></div>
                  <div className="form-group"><label className="label">Clinical Finding (CF)</label><input className="input" name="cf" defaultValue={editingPlan?.cf} placeholder="e.g. Deep Caries" /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Investigation</label><input className="input" name="investigation" defaultValue={editingPlan?.investigation} placeholder="e.g. X-Ray, RVG" /></div>
                  <div className="form-group"><label className="label">Status</label>
                    <select className="select" name="status" defaultValue={editingPlan?.status ?? 'Not Start'}>
                      <option value="Not Start">Not Start</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => { setShowTreatmentPlanModal(false); setEditingPlan(null); }}>Cancel</button><button type="submit" className="btn-primary">{editingPlan ? 'Update' : 'Add'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showTreatmentRecordModal && profilePatient && (
        <div className="records-modal-overlay" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-receipt"></i> {editingRecord ? 'Edit' : 'Add'} Treatment Record</h5><button type="button" className="records-modal-close" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveTreatmentRecord} key={editingRecord?.id ?? 'new'}>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Date</label><input type="date" className="input" name="date" defaultValue={editingRecord?.date ?? new Date().toISOString().split('T')[0]} required /></div>
                  <div className="form-group" style={{ flex: 2 }}><label className="label">Treatment Done</label><input className="input" name="treatmentDone" defaultValue={editingRecord?.treatmentDone} placeholder="e.g. Scaling, Extraction" required /></div>
                </div>
                <div className="records-form-row">
                  <div className="form-group"><label className="label">Cost (TK)</label><input type="number" className="input" name="cost" defaultValue={editingRecord?.cost} placeholder="0" required /></div>
                  <div className="form-group"><label className="label">Paid (TK)</label><input type="number" className="input" name="paid" defaultValue={editingRecord?.paid} placeholder="0" required /></div>
                  <div className="form-group"><label className="label">Due (TK)</label><input type="number" className="input" name="due" defaultValue={editingRecord?.due} placeholder="0" /></div>
                </div>
                <div className="form-group"><label className="label">Doctor Signature</label><input className="input" name="doctorSignature" defaultValue={editingRecord?.doctorSignature} placeholder="Doctor's name" /></div>
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => { setShowTreatmentRecordModal(false); setEditingRecord(null); }}>Cancel</button><button type="submit" className="btn-primary">{editingRecord ? 'Update' : 'Add'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showConsentModal && profilePatient && (
        <div className="records-modal-overlay" onClick={() => setShowConsentModal(false)}>
          <div className="records-modal" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header"><h5><i className="fa-solid fa-file-signature"></i> Patient Consent</h5><button type="button" className="records-modal-close" onClick={() => setShowConsentModal(false)}>×</button></div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveConsent}>
                <div className="consent-text">
                  <p>I, <strong>{profilePatient.name}</strong>, do hereby agree to undergo necessary treatment of myself / my dependent.</p>
                  <p>The procedure and the potential complications (if any) were explained to me.</p>
                  <p>I accept the plan of dental treatment, risk factors and treatment cost for myself / my children.</p>
                </div>
                <div className="records-form-row">
                  <div className="form-group" style={{ flex: 2 }}><label className="label">Signature / Name</label><input className="input" name="signatureName" defaultValue={consent?.signatureName ?? profilePatient.name} required /></div>
                  <div className="form-group"><label className="label">Date</label><input type="date" className="input" name="signatureDate" defaultValue={consent?.signatureDate ?? new Date().toISOString().split('T')[0]} required /></div>
                </div>
                <div className="records-modal-footer"><button type="button" className="btn-ghost" onClick={() => setShowConsentModal(false)}>Cancel</button><button type="submit" className="btn-primary">Sign Consent</button></div>
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

      {showProductModal && (
        <div className="records-modal-overlay" onClick={() => { setShowProductModal(false); setEditingProduct(null); }}>
          <div className="records-modal records-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header">
              <h5><i className="fa-solid fa-box"></i> {editingProduct ? 'Edit Product' : 'Add New Product'}</h5>
              <button type="button" className="records-modal-close" onClick={() => { setShowProductModal(false); setEditingProduct(null); }}>×</button>
            </div>
            <div className="records-modal-body">
              <form onSubmit={handleSaveProduct} key={editingProduct?.id ?? 'new'}>
                <div className="records-form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="label">Product Name <span className="required">*</span></label>
                    <input type="text" className="input" name="name" placeholder="e.g. Oral-B Electric Toothbrush" defaultValue={editingProduct?.name} required />
                  </div>
                  <div className="form-group">
                    <label className="label">SKU</label>
                    <input type="text" className="input" name="sku" placeholder="e.g. TB-001" defaultValue={editingProduct?.sku} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea className="input" name="description" rows={3} placeholder="Product description..." defaultValue={editingProduct?.description} />
                </div>
                <div className="records-form-row">
                  <div className="form-group">
                    <label className="label">Category <span className="required">*</span></label>
                    <select className="select" name="category" defaultValue={editingProduct?.category ?? 'OTHER'} required>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Price (৳) <span className="required">*</span></label>
                    <input type="number" className="input" name="price" placeholder="0" defaultValue={editingProduct?.price} required min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="label">Compare Price (৳)</label>
                    <input type="number" className="input" name="comparePrice" placeholder="Original price" defaultValue={editingProduct?.comparePrice} min="0" step="0.01" />
                  </div>
                </div>
                <div className="records-form-row">
                  <div className="form-group">
                    <label className="label">Stock Quantity</label>
                    <input type="number" className="input" name="stock" placeholder="0" defaultValue={editingProduct?.stock ?? 0} min="0" />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                    <label className="records-checkbox">
                      <input type="checkbox" name="isFeatured" defaultChecked={editingProduct?.isFeatured} />
                      <span>Featured Product</span>
                    </label>
                  </div>
                </div>
                <div className="records-modal-footer">
                  <button type="button" className="btn-ghost" onClick={() => { setShowProductModal(false); setEditingProduct(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingProduct ? 'Update Product' : 'Add Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && viewingOrder && (
        <div className="records-modal-overlay" onClick={() => { setShowOrderModal(false); setViewingOrder(null); }}>
          <div className="records-modal records-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="records-modal-header">
              <h5><i className="fa-solid fa-shopping-bag"></i> Order Details - {viewingOrder.orderNo}</h5>
              <button type="button" className="records-modal-close" onClick={() => { setShowOrderModal(false); setViewingOrder(null); }}>×</button>
            </div>
            <div className="records-modal-body">
              <div className="order-details-grid">
                <div className="order-section">
                  <h6 className="order-section-title">Customer Information</h6>
                  <dl className="records-dl">
                    <dt>Name</dt><dd>{viewingOrder.customerName}</dd>
                    <dt>Phone</dt><dd>{viewingOrder.customerPhone}</dd>
                    {viewingOrder.customerEmail && <><dt>Email</dt><dd>{viewingOrder.customerEmail}</dd></>}
                  </dl>
                </div>
                <div className="order-section">
                  <h6 className="order-section-title">Shipping Address</h6>
                  <p>{viewingOrder.shippingAddress}</p>
                  <p>{viewingOrder.shippingCity}</p>
                </div>
                <div className="order-section">
                  <h6 className="order-section-title">Order Info</h6>
                  <dl className="records-dl">
                    <dt>Date</dt><dd>{new Date(viewingOrder.createdAt).toLocaleString()}</dd>
                    <dt>Payment</dt><dd>{viewingOrder.paymentMethod}</dd>
                    <dt>Status</dt>
                    <dd>
                      <span className="status-badge" style={{ background: getStatusColor(viewingOrder.status), color: 'white' }}>
                        {ORDER_STATUSES.find(s => s.id === viewingOrder.status)?.name || viewingOrder.status}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="order-items-section">
                <h6 className="order-section-title">Order Items</h6>
                <table className="records-table">
                  <thead>
                    <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>৳{item.price}</td>
                        <td>৳{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}><strong>Total</strong></td>
                      <td><strong>৳{viewingOrder.total.toLocaleString()}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="order-actions">
                <h6 className="order-section-title">Update Status</h6>
                <div className="order-status-buttons">
                  {ORDER_STATUSES.map(status => (
                    <button
                      key={status.id}
                      type="button"
                      className={`btn-status ${viewingOrder.status === status.id ? 'active' : ''}`}
                      style={{ borderColor: status.color, color: viewingOrder.status === status.id ? 'white' : status.color, background: viewingOrder.status === status.id ? status.color : 'transparent' }}
                      onClick={() => { handleUpdateOrderStatus(viewingOrder, status.id); setViewingOrder({ ...viewingOrder, status: status.id }); }}
                    >
                      {status.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="records-modal-footer">
                <button type="button" className="btn-ghost" onClick={() => { setShowOrderModal(false); setViewingOrder(null); }}>Close</button>
                <a href={`https://wa.me/${viewingOrder.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <i className="fa-brands fa-whatsapp"></i> Contact Customer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

