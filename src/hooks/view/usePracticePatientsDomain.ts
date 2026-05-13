import type { FormEvent } from 'react';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import api from '@/api';
import { buildPatientRecordFormPrintHtml } from '@/hooks/view/buildPatientRecordFormPrintHtml';
import type { ConsentVM, MedHistoryVM, TreatmentPlanVM, TreatmentRecordVM } from '@/hooks/view/apiReturnTypes';
import type { PatientRecordFormData } from '@/hooks/view/practiceWorkspaceShared';
import { getDefaultPatientRecordFormData } from '@/hooks/view/practiceWorkspaceShared';
import {
  mapPatientToViewModel,
  type PatientViewModel,
} from '@/viewModels';
import type { DentalChartRowPayload, PatientTimelineEventPayload } from '@/lib/core/corePatientsApi';

export function usePracticePatientsDomain(opts: {
  token: string | null | undefined;
  patients: PatientViewModel[];
  setPatients: Dispatch<SetStateAction<PatientViewModel[]>>;
  loadData: () => void | Promise<void>;
  showToast: (msg: string) => void;
  flashNotice: (msg: string, ms?: number) => void;
  clinicBrand: { clinicName: string; phone: string };
  gotoPatientDetailScreen: () => void;
  goToPrescriptionComposer: () => void;
  navigateFromPatientDetailToPatientsNav: () => void;
}) {
  const {
    token,
    patients,
    setPatients,
    loadData,
    showToast,
    flashNotice,
    clinicBrand,
    gotoPatientDetailScreen,
    goToPrescriptionComposer,
    navigateFromPatientDetailToPatientsNav,
  } = opts;

  const [selectedPatient, setSelectedPatient] = useState<PatientViewModel | null>(null);

  const [smsComposePatientId, setSmsComposePatientId] = useState('');
  const [smsComposeMessage, setSmsComposeMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    email: '',
    address: '',
    bloodGroup: '',
    occupation: '',
    refBy: '',
  });

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  const [patientProfileTab, setPatientProfileTab] = useState<
    'info' | 'timeline' | 'treatment' | 'ledger' | 'consent' | 'record-form'
  >('info');
  const [dentalChartRows, setDentalChartRows] = useState<DentalChartRowPayload[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<PatientTimelineEventPayload[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [toothNumberingSystem, setToothNumberingSystem] = useState<'fdi' | 'universal'>('fdi');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<MedHistoryVM>({});
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanVM[]>([]);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecordVM[]>([]);
  const [consent, setConsent] = useState<ConsentVM | null>(null);

  const [patientRecordForm, setPatientRecordForm] = useState<PatientRecordFormData>(() => getDefaultPatientRecordFormData());

  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [showTreatmentRecordModal, setShowTreatmentRecordModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlanVM | null>(null);
  const [editingRecord, setEditingRecord] = useState<TreatmentRecordVM | null>(null);

  const [paymentCostInput, setPaymentCostInput] = useState<string>('0');
  const [paymentPaidInput, setPaymentPaidInput] = useState<string>('0');

  const paymentDuePreview = (() => {
    const costNum = parseFloat(paymentCostInput) || 0;
    const paidNum = parseFloat(paymentPaidInput) || 0;
    const dueNum = costNum - paidNum;
    return (dueNum > 0 ? dueNum : 0).toFixed(2);
  })();

  useEffect(() => {
    if (!showTreatmentRecordModal) return;
    setPaymentCostInput(editingRecord?.cost ?? '0');
    setPaymentPaidInput(editingRecord?.paid ?? '0');
  }, [showTreatmentRecordModal, editingRecord?.id, editingRecord?.cost, editingRecord?.paid]);

  const saveMedicalHistory = useCallback(
    (patientId: string, data: MedHistoryVM) => {
      setMedicalHistory(data);
      if (token) {
        void api.patients
          .updateMedicalHistory(patientId, api.patients.serializeMedicalHistoryForUpdate(data))
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Failed to save medical history';
            flashNotice(msg);
          });
      }
    },
    [flashNotice, token],
  );

  const loadPatientRecordForm = useCallback((patient: PatientViewModel) => {
    const defaults = getDefaultPatientRecordFormData();
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
  }, []);

  const savePatientRecordForm = useCallback((_patientId: string, data: PatientRecordFormData) => {
    setPatientRecordForm(data);
  }, []);

  const saveConsentRemote = useCallback(
    (patientId: string, data: ConsentVM) => {
      setConsent(data);
      if (token) {
        void api.patients
          .addConsent(patientId, {
            consentType: 'treatment',
            consentText: data.consentText,
            signatureName: data.signatureName,
            agreed: data.agreed,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Failed to save consent';
            flashNotice(msg);
          });
      }
    },
    [flashNotice, token],
  );

  const calculateTotals = useCallback(() => {
    const totalCost = treatmentRecords.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    const totalPaid = treatmentRecords.reduce((sum, r) => sum + (parseFloat(r.paid) || 0), 0);
    return { totalCost, totalPaid, totalDue: totalCost - totalPaid };
  }, [treatmentRecords]);

  useEffect(() => {
    if (!selectedPatient?.id || !token) {
      setMedicalHistory({});
      setTreatmentPlans([]);
      setTreatmentRecords([]);
      setConsent(null);
      setSelectedTeeth([]);
      setDentalChartRows([]);
      return;
    }
    let cancelled = false;
    void api.patients
      .workspaceHydration(selectedPatient.id)
      .then((b) => {
        if (cancelled) return;
        setMedicalHistory(b.medicalHistory);
        setTreatmentPlans(b.treatmentPlans);
        setTreatmentRecords(b.treatmentRecords);
        setConsent(b.consent);
        setSelectedTeeth(b.dentalTeethSelected);
        setDentalChartRows(b.dentalChartRows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMedicalHistory({});
        setTreatmentPlans([]);
        setTreatmentRecords([]);
        setConsent(null);
        setSelectedTeeth([]);
        setDentalChartRows([]);
        showToast(e instanceof Error ? e.message : 'Failed to load patient record');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPatient?.id, showToast, token]);

  useEffect(() => {
    if (!selectedPatient?.id || !token || patientProfileTab !== 'timeline') return;
    let cancelled = false;
    setTimelineLoading(true);
    void api.patients
      .timeline(selectedPatient.id)
      .then((r) => {
        if (cancelled) return;
        setTimelineEvents(r.events);
        setTimelineLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTimelineEvents([]);
        setTimelineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPatient?.id, token, patientProfileTab]);

  const handleDentalSurfaceToggle = useCallback(
    async (tooth: number, surface: 'M' | 'D' | 'O' | 'B' | 'L') => {
      if (!selectedPatient || !token) return;
      const row = dentalChartRows.find((r) => r.toothNumber === tooth);
      const prevSurfaces: Record<string, string> = { ...(row?.surfaces ?? {}) };
      const cycle = ['', 'Caries', 'Filled', 'Crown'];
      const cur = prevSurfaces[surface] ?? '';
      const nextIdx = (cycle.indexOf(cur) + 1) % cycle.length;
      const nextVal = cycle[nextIdx];
      if (nextVal === '') delete prevSurfaces[surface];
      else prevSurfaces[surface] = nextVal;
      try {
        const updated = await api.patients.updateDentalChart(selectedPatient.id, {
          toothNumber: tooth,
          condition: row?.condition ?? 'Recorded',
          surfaces: prevSurfaces,
          notes: row?.notes ?? undefined,
          treatment: row?.treatment ?? undefined,
          treatmentDate: row?.treatmentDate ?? undefined,
        });
        setDentalChartRows((prev) => {
          const rest = prev.filter((r) => r.toothNumber !== tooth);
          return [...rest, updated];
        });
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Could not save surface');
      }
    },
    [dentalChartRows, selectedPatient, showToast, token],
  );

  const handleSmsTemplate = useCallback(
    (kind: 'appointment' | 'prescription' | 'lab' | 'payment' | 'birthday' | 'custom') => {
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
      const clinic = clinicBrand.clinicName || 'our clinic';
      const phoneLine = clinicBrand.phone ? ` Tel: ${clinicBrand.phone}` : '';
      const body: Record<string, string> = {
        appointment: `Hello ${p.name}, this is ${clinic}.${phoneLine} Reminder: please attend your scheduled dental appointment. Reply if you need to reschedule.`,
        prescription: `Hello ${p.name}, your prescription is ready at ${clinic}.${phoneLine}`,
        lab: `Hello ${p.name}, lab work update from ${clinic}.${phoneLine} Please contact us for details.`,
        payment: `Hello ${p.name}, friendly reminder from ${clinic}: there may be a balance due on your account.${phoneLine}`,
        birthday: `Happy birthday ${p.name}! Best wishes from ${clinic}.${phoneLine}`,
      };
      setSmsComposeMessage(body[kind] ?? '');
      showToast('Template applied — review and send');
    },
    [clinicBrand.clinicName, clinicBrand.phone, patients, showToast, smsComposePatientId],
  );

  const handleSendSmsCompose = useCallback(async () => {
    if (!token) {
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
  }, [patients, showToast, smsComposeMessage, smsComposePatientId, token]);

  const handleAddPatient = useCallback(async () => {
    if (!patientForm.name || !patientForm.phone) {
      showToast('Name and phone are required');
      return;
    }
    if (token) {
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
        void loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to add patient');
      }
      return;
    }
    setPatients((prev: PatientViewModel[]) => {
      const optimistic = mapPatientToViewModel(
        api.optimistic.patientFromForm({ ...patientForm, ordinal: prev.length }),
      );
      return [optimistic, ...prev];
    });
    setPatientForm({ name: '', phone: '', age: '', gender: '', email: '', address: '', bloodGroup: '', occupation: '', refBy: '' });
    showToast('Patient added successfully');
  }, [loadData, patientForm, setPatients, showToast, token]);

  const exportPatientsListCsv = useCallback(
    (patientsSortedForList: PatientViewModel[]) => {
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
    },
    [showToast],
  );

  const handleDeletePatient = useCallback(
    async (p: PatientViewModel) => {
      if (!window.confirm(`Delete patient "${p.name}" (${p.regNo || p.phone})? This cannot be undone.`)) return;
      if (token) {
        try {
          await api.patients.delete(p.id);
          if (selectedPatient?.id === p.id) {
            setSelectedPatient(null);
            navigateFromPatientDetailToPatientsNav();
          }
          showToast('Patient deleted');
          void loadData();
        } catch (e: unknown) {
          showToast((e as { message?: string })?.message ?? 'Failed to delete patient');
        }
        return;
      }
      showToast('Sign in to delete patients');
    },
    [loadData, navigateFromPatientDetailToPatientsNav, selectedPatient?.id, showToast, token],
  );

  const selectPatientForView = useCallback(
    (patient: PatientViewModel) => {
      setSelectedPatient(patient);
      setPatientProfileTab('info');
      setChiefComplaint('');
      setClinicalFindings('');
      setInvestigation('');
      setDiagnosis('');
      loadPatientRecordForm(patient);
      gotoPatientDetailScreen();
    },
    [gotoPatientDetailScreen, loadPatientRecordForm],
  );

  const selectPatientForPrescription = useCallback(
    (patient: PatientViewModel | null) => {
      setSelectedPatient(patient);
      goToPrescriptionComposer();
    },
    [goToPrescriptionComposer],
  );

  const toggleTooth = useCallback(
    (num: number) => {
      setSelectedTeeth((prev) => {
        const next = prev.includes(num) ? prev.filter((t) => t !== num) : [...prev, num];
        const run = selectedPatient?.id && token;
        const added = next.includes(num);
        if (run && selectedPatient?.id) {
          void api.patients
            .updateDentalChart(selectedPatient.id, {
              toothNumber: num,
              condition: added ? 'SELECTED' : 'NONE',
              notes: '',
              treatment: '',
            })
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : 'Failed to update chart';
              flashNotice(msg);
            });
        }
        return next;
      });
    },
    [flashNotice, selectedPatient?.id, token],
  );

  const openPatientRecordFormPrint = useCallback(() => {
    if (!selectedPatient) return;
    savePatientRecordForm(selectedPatient.id, patientRecordForm);
    const html = buildPatientRecordFormPrintHtml(selectedPatient.name || 'Patient', medicalHistory || {}, patientRecordForm);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      showToast('Popups blocked. Allow popups to print/save PDF.');
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [medicalHistory, patientRecordForm, savePatientRecordForm, selectedPatient, showToast]);

  const saveTreatmentPlans = useCallback((_patientId: string, plans: TreatmentPlanVM[]) => {
    setTreatmentPlans(plans);
  }, []);

  const saveTreatmentRecords = useCallback((_patientId: string, records: TreatmentRecordVM[]) => {
    setTreatmentRecords(records);
  }, []);

  const persistPatientProfileDraft = useCallback(async () => {
    if (!selectedPatient) return;
    savePatientRecordForm(selectedPatient.id, patientRecordForm);

    const updatedPatient: PatientViewModel = {
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
      if (token) {
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
        setPatients((prev: PatientViewModel[]) =>
          prev.map((pX: PatientViewModel) => (pX.id === updatedPatient.id ? updatedPatient : pX)),
        );
      }

      setSelectedPatient(updatedPatient);
      showToast('Patient profile updated');
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message ?? 'Failed to update patient profile');
    }
  }, [
    loadData,
    patientRecordForm,
    savePatientRecordForm,
    selectedPatient,
    setPatients,
    showToast,
    token,
  ]);

  const handleSaveTreatmentPlan = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedPatient) return;
      const form = e.currentTarget;
      const fd = new FormData(form);
      let plan: TreatmentPlanVM = {
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
      const apiStatus = plan.status === 'Not Start' ? 'NOT_STARTED' : plan.status;
      if (token) {
        try {
          if (editingPlan) {
            await api.patients.updateTreatmentPlan(selectedPatient.id, plan.id, {
              toothNumber: plan.toothNumber || undefined,
              diagnosis: plan.diagnosis,
              procedure: plan.procedure,
              cost: parseFloat(plan.cost) || 0,
              cc: plan.cc,
              cf: plan.cf,
              investigation: plan.investigation,
              status: apiStatus,
            });
          } else {
            const { id: serverPlanId } = await api.patients.addTreatmentPlan(selectedPatient.id, {
              toothNumber: plan.toothNumber || undefined,
              diagnosis: plan.diagnosis,
              procedure: plan.procedure,
              cost: parseFloat(plan.cost) || 0,
              cc: plan.cc,
              cf: plan.cf,
              investigation: plan.investigation,
              status: apiStatus,
            });
            plan = { ...plan, id: serverPlanId };
          }
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Failed to save treatment plan');
          return;
        }
      }
      const updatedPlans = editingPlan ? treatmentPlans.map((px) => (px.id === plan.id ? plan : px)) : [...treatmentPlans, plan];
      saveTreatmentPlans(selectedPatient.id, updatedPlans);
      setShowTreatmentPlanModal(false);
      setEditingPlan(null);
      showToast('Treatment plan saved!');
    },
    [editingPlan, saveTreatmentPlans, selectedPatient, showToast, token, treatmentPlans],
  );

  const handleSaveMedicalHistory = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedPatient) return;
      const form = e.currentTarget;
      const fd = new FormData(form);

      const data: MedHistoryVM = {
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
    },
    [saveMedicalHistory, selectedPatient, showToast],
  );

  const handleDeleteTreatmentPlan = useCallback(
    async (plan: TreatmentPlanVM) => {
      if (!selectedPatient) return;
      if (token) {
        try {
          await api.patients.deleteTreatmentPlan(selectedPatient.id, plan.id);
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Failed to delete treatment plan');
          return;
        }
      }
      const updatedPlans = treatmentPlans.filter((px) => px.id !== plan.id);
      saveTreatmentPlans(selectedPatient.id, updatedPlans);
      showToast('Treatment plan deleted!');
    },
    [saveTreatmentPlans, selectedPatient, showToast, token, treatmentPlans],
  );

  const handleSaveTreatmentRecord = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedPatient) return;
      const form = e.currentTarget;
      const fd = new FormData(form);
      const treatmentDone = String(fd.get('treatmentDone') ?? '').trim();
      if (!treatmentDone) {
        showToast('Treatment Done is required');
        return;
      }
      let record: TreatmentRecordVM = {
        id: editingRecord?.id ?? crypto.randomUUID(),
        date: String(fd.get('date') ?? new Date().toISOString().split('T')[0]),
        treatmentDone,
        cost: String(fd.get('cost') ?? '0'),
        paid: String(fd.get('paid') ?? '0'),
        due: (() => {
          const costNum = parseFloat(String(fd.get('cost') ?? '0')) || 0;
          const paidNum = parseFloat(String(fd.get('paid') ?? '0')) || 0;
          const dueNum = Math.max(0, costNum - paidNum);
          return String(dueNum);
        })(),
        patientSignature: String(fd.get('patientSignature') ?? ''),
        doctorSignature: String(fd.get('doctorSignature') ?? ''),
      };
      if (!token) {
        showToast('Sign in to save treatment records.');
        return;
      }
      try {
        if (editingRecord) {
          const reconciled = await api.patients.updateTreatmentRecord(selectedPatient.id, editingRecord.id, {
            treatmentDone: record.treatmentDone,
            date: record.date,
            cost: record.cost,
            paid: record.paid,
            due: record.due,
            doctorSignature: record.doctorSignature || undefined,
          });
          record = {
            ...reconciled,
            patientSignature: record.patientSignature,
          };
        } else {
          const { id: serverRecordId } = await api.patients.addTreatmentRecord(selectedPatient.id, {
            treatmentDone: record.treatmentDone,
            date: record.date,
            cost: record.cost,
            paid: record.paid,
            due: record.due,
            doctorSignature: record.doctorSignature || undefined,
          });
          record = { ...record, id: serverRecordId };
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to save treatment record');
        return;
      }
      const updatedRecords = editingRecord ? treatmentRecords.map((r) => (r.id === record.id ? record : r)) : [...treatmentRecords, record];
      saveTreatmentRecords(selectedPatient.id, updatedRecords);
      setShowTreatmentRecordModal(false);
      setEditingRecord(null);
      showToast(editingRecord ? 'Record updated!' : 'Record added!');
    },
    [editingRecord, saveTreatmentRecords, selectedPatient, showToast, token, treatmentRecords],
  );

  const handleDeleteTreatmentRecord = useCallback(
    async (record: TreatmentRecordVM) => {
      if (!selectedPatient) return;
      if (!token) {
        showToast('Sign in to delete treatment records.');
        return;
      }
      try {
        await api.patients.deleteTreatmentRecord(selectedPatient.id, record.id);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to delete treatment record');
        return;
      }
      const updatedRecords = treatmentRecords.filter((r) => r.id !== record.id);
      saveTreatmentRecords(selectedPatient.id, updatedRecords);
      showToast('Record deleted!');
    },
    [saveTreatmentRecords, selectedPatient, showToast, token, treatmentRecords],
  );

  const handleSaveConsentLocal = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedPatient) return;
      const form = e.currentTarget;
      const fd = new FormData(form);
      const consentType = String(fd.get('consentType') ?? 'treatment');
      const consentTexts: Record<string, string> = {
        treatment:
          'I accept the plan of dental treatment, risk factors and treatment cost for myself / my children. The procedure & the potential complications (if any) were explained to me.',
        agree:
          'I do hereby agree to undergo necessary treatment of myself/my dependent. The procedure & the potential complications (if any) were explained to me.',
      };
      const newConsent: ConsentVM = {
        patientId: selectedPatient.id,
        consentText: consentTexts[consentType] || consentTexts.agree,
        signatureName: String(fd.get('signatureName') ?? ''),
        signatureDate: String(fd.get('signatureDate') ?? new Date().toISOString().split('T')[0]),
        agreed: true,
      };
      saveConsentRemote(selectedPatient.id, newConsent);
      setShowConsentModal(false);
      showToast('Consent saved!');
    },
    [saveConsentRemote, selectedPatient, showToast],
  );

  return {
    selectedPatient,
    setSelectedPatient,
    smsComposePatientId,
    setSmsComposePatientId,
    smsComposeMessage,
    setSmsComposeMessage,
    smsSending,
    patientForm,
    setPatientForm,
    selectedTeeth,
    setSelectedTeeth,
    patientProfileTab,
    setPatientProfileTab,
    dentalChartRows,
    timelineEvents,
    timelineLoading,
    handleDentalSurfaceToggle,
    toothNumberingSystem,
    setToothNumberingSystem,
    chiefComplaint,
    setChiefComplaint,
    clinicalFindings,
    setClinicalFindings,
    investigation,
    setInvestigation,
    diagnosis,
    setDiagnosis,
    medicalHistory,
    treatmentPlans,
    treatmentRecords,
    consent,
    patientRecordForm,
    setPatientRecordForm,
    showMedicalHistoryModal,
    setShowMedicalHistoryModal,
    showTreatmentPlanModal,
    setShowTreatmentPlanModal,
    showTreatmentRecordModal,
    setShowTreatmentRecordModal,
    showConsentModal,
    setShowConsentModal,
    editingPlan,
    setEditingPlan,
    editingRecord,
    setEditingRecord,
    paymentCostInput,
    setPaymentCostInput,
    paymentPaidInput,
    setPaymentPaidInput,
    paymentDuePreview,
    handleSmsTemplate,
    handleSendSmsCompose,
    handleAddPatient,
    exportPatientsListCsv,
    handleDeletePatient,
    selectPatientForView,
    selectPatientForPrescription,
    startNewPrescriptionForPatient: selectPatientForPrescription,
    toggleTooth,
    loadPatientRecordForm,
    savePatientRecordForm,
    openPatientRecordFormPrint,
    calculateTotals,
    handleSaveTreatmentPlan,
    handleSaveMedicalHistory,
    handleDeleteTreatmentPlan,
    handleSaveTreatmentRecord,
    handleDeleteTreatmentRecord,
    handleSaveConsentLocal,
    persistPatientProfileDraft,
  };
}
