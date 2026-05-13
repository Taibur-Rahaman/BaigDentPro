import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeDashboardBundle } from '@/hooks/view/usePracticeDashboardBundle';
import { usePatientsDirectoryView } from '@/hooks/view/usePatientsDirectoryView';
import { useAppointmentsScheduleView } from '@/hooks/view/useAppointmentsScheduleView';
import { useBillingWorkspaceView } from '@/hooks/view/useBillingWorkspaceView';
import { useDashboardOverviewView } from '@/hooks/view/useDashboardOverviewView';
import { usePrescriptionsWorkspaceView } from '@/hooks/view/usePrescriptionsWorkspaceView';
import { usePracticeBillingDomain } from '@/hooks/view/usePracticeBillingDomain';
import { usePracticePrescriptionsDomain } from '@/hooks/view/usePracticePrescriptionsDomain';
import { usePracticeSuperAdminDomain } from '@/hooks/view/usePracticeSuperAdminDomain';
import { usePracticeAppointmentsDomain } from '@/hooks/view/usePracticeAppointmentsDomain';
import { usePracticePatientsDomain } from '@/hooks/view/usePracticePatientsDomain';
import { usePracticeWorkspace, useRegisterPracticeWorkspaceRefresh } from '@/contexts/practiceWorkspace/PracticeWorkspaceContext';
import { practiceWorkspaceHref } from '@/pages/practice/practiceNav';

export type PracticeWorkspaceControllerProps = {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userClinicId?: string;
  currentUserId?: string;
};

export function usePracticeWorkspaceControllerModel({
  onLogout,
  userName = 'Doctor',
  userRole,
  userClinicId,
  currentUserId,
}: PracticeWorkspaceControllerProps) {
  const { token } = useAuth();
  const {
    patients,
    setPatients,
    appointments,
    setAppointments,
    prescriptions,
    invoices,
    setInvoices,
    labOrders,
    setLabOrders,
    dataLoading,
    apiError,
    setApiError,
    dashboardApiStats,
    dashboardRecentPatients,
    dashboardRevenueChart,
    dashboardAppointmentChart,
    reload: loadData,
  } = usePracticeDashboardBundle(token);
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    setAuxiliaryTab,
    filters: workspaceFilters,
    setFilters: setWorkspaceFilters,
    setSelectedPatientId,
    setSelectedAppointmentId,
    skipNextUrlDerivedTabSync,
  } = usePracticeWorkspace();
  useRegisterPracticeWorkspaceRefresh(loadData);

  const setPracticeNav = setActiveTab;
  const setAuxNav = setAuxiliaryTab;
  const activeNav = activeTab;

  const [showNotice, setShowNotice] = useState<string | null>(null);
  const notifyShort = useCallback((message: string) => {
    setShowNotice(message);
    setTimeout(() => setShowNotice(null), 3000);
  }, []);
  const showToast = notifyShort;

  const {
    searchQuery,
    setSearchQuery,
    patientSearchLoading,
    patientSortKey,
    patientSortDir,
    togglePatientSort,
    patientListPage,
    setPatientListPage,
    patientListPageSize,
    setPatientListPageSize,
    patientsSortedForList,
    patientListTotalPages,
    patientsPageSlice,
  } = usePatientsDirectoryView({
    token,
    activeNav,
    patients,
    searchQuery: workspaceFilters.patientSearchQuery,
    setSearchQuery: (action) => {
      setWorkspaceFilters((f) => ({
        ...f,
        patientSearchQuery: typeof action === 'function' ? action(f.patientSearchQuery) : action,
      }));
    },
  });
  const {
    appointmentScheduleFilter,
    setAppointmentScheduleFilter,
    appointmentViewMode,
    setAppointmentViewMode,
    setCalendarWeekOffset,
    filteredAppointments,
    todayAppointments,
    weekCalendarDays,
  } = useAppointmentsScheduleView(appointments, {
    appointmentScheduleFilter: workspaceFilters.appointmentScheduleFilter,
    setAppointmentScheduleFilter: (v) =>
      setWorkspaceFilters((f) => ({ ...f, appointmentScheduleFilter: v })),
  });
  const {
    billingInvoiceFilter,
    setBillingInvoiceFilter,
    filteredInvoicesForBilling,
    revenueToday,
    invoiceIsOverdue,
  } = useBillingWorkspaceView(invoices, {
    billingInvoiceFilter: workspaceFilters.billingInvoiceFilter,
    setBillingInvoiceFilter: (v) => setWorkspaceFilters((f) => ({ ...f, billingInvoiceFilter: v })),
  });
  const rxWorkspace = usePrescriptionsWorkspaceView(prescriptions);
  const stats = useDashboardOverviewView({
    dashboardApiStats,
    patients,
    appointments,
    prescriptions,
    invoices,
    labOrders,
    todayAppointmentsCount: todayAppointments.length,
  });

  const billingDomain = usePracticeBillingDomain({
    token,
    userName,
    patients,
    invoices,
    setInvoices,
    setLabOrders,
    filteredInvoicesForBilling,
    loadData,
    showToast,
  });

  const prescriptionsDomain = usePracticePrescriptionsDomain();

  const superAdminDomain = usePracticeSuperAdminDomain({
    userRole,
    currentUserId,
    token,
    activeNav,
    showToast,
    onLoadError: notifyShort,
  });

  const appointmentsDomain = usePracticeAppointmentsDomain({
    token,
    userClinicId,
    appointments,
    setAppointments,
    patients,
    filteredAppointments,
    loadData,
    showToast,
  });

  const patientsDomain = usePracticePatientsDomain({
    token,
    patients,
    setPatients,
    loadData,
    showToast,
    flashNotice: notifyShort,
    clinicBrand: {
      clinicName: billingDomain.dashboardHeaderDraft.clinicName,
      phone: billingDomain.dashboardHeaderDraft.phone,
    },
    gotoPatientDetailScreen: () => {
      skipNextUrlDerivedTabSync();
      navigate(practiceWorkspaceHref('patients'), { replace: true });
      setAuxiliaryTab('patient-detail');
    },
    goToPrescriptionComposer: () => setPracticeNav('prescription'),
    navigateFromPatientDetailToPatientsNav: () => setPracticeNav('patients'),
  });

  const {
    dashboardHeaderDraft,
    setDashboardHeaderDraft,
    dashboardPrintDraft,
    setDashboardPrintDraft,
    invoiceForm,
    setInvoiceForm,
    labForm,
    setLabForm,
    billingProcedures,
    customLineDescription,
    setCustomLineDescription,
    customLineAmount,
    setCustomLineAmount,
    handleCreateInvoice,
    handlePrintInvoice,
    handlePrintMushok63,
    handleCreateLabOrder,
    exportInvoicesCsv,
    markLabOrderDelivered,
    saveDashboardClinic,
    saveDashboardDoctor,
    saveDashboardPrint,
  } = billingDomain;

  const { drugSearch, setDrugSearch, filteredDrugs } = prescriptionsDomain;

  const {
    superAdminTab,
    setSuperAdminTab,
    superAdminDoctorSearch,
    setSuperAdminDoctorSearch,
    superAdminPatientSearch,
    setSuperAdminPatientSearch,
    superAdminStats,
    superAdminClinics,
    superAdminRevenue,
    superAdminUtilization,
    superAdminLogs,
    superAdminDoctors,
    superAdminPatients,
    superAdminPrescriptions,
    superAdminLoading,
    superAdminPending,
    clinicAdminUsers,
    clinicAdminTotal,
    clinicAdminLoading,
    clinicAdminSearchInput,
    setClinicAdminSearchInput,
    clinicAdminPage,
    setClinicAdminPage,
    adminFilterClinicId,
    setAdminFilterClinicId,
    adminClinicOptions,
    newStaffForm,
    setNewStaffForm,
    approvePendingSignup,
    rejectPendingSignup,
    updateDoctorRow,
    updatePatientRow,
    updatePrescriptionRow,
    handleCreateStaffUser,
    handleToggleStaffActive,
    handleStaffRoleChange,
  } = superAdminDomain;

  const {
    appointmentForm,
    setAppointmentForm,
    editingAppointmentId,
    handleSendAppointmentReminder,
    handleConfirmAppointment,
    handleCancelAppointment,
    handleCompleteAppointment,
    handleAddAppointment,
    beginRescheduleAppointment,
    cancelAppointmentEditMode,
    exportAppointmentsCsv,
    downloadAppointmentIcs,
    getGoogleCalendarUrl,
  } = appointmentsDomain;

  useEffect(() => {
    setSelectedAppointmentId(editingAppointmentId ?? null);
  }, [editingAppointmentId, setSelectedAppointmentId]);

  const {
    selectedPatient,
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
    startNewPrescriptionForPatient,
    toggleTooth,
    openPatientRecordFormPrint,
    calculateTotals,
    handleSaveTreatmentPlan,
    handleSaveMedicalHistory,
    handleDeleteTreatmentPlan,
    handleSaveTreatmentRecord,
    handleDeleteTreatmentRecord,
    handleSaveConsentLocal,
    persistPatientProfileDraft,
  } = patientsDomain;

  useEffect(() => {
    setSelectedPatientId(selectedPatient?.id ?? null);
  }, [selectedPatient?.id, setSelectedPatientId]);

  const handleAddCustomLine = useCallback(() => {
    const desc = customLineDescription.trim();
    const amount = parseFloat(customLineAmount) || 0;
    if (!desc) return;
    setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: desc, amount }] });
    setCustomLineDescription('');
    setCustomLineAmount('');
  }, [customLineAmount, customLineDescription, invoiceForm, setCustomLineDescription, setCustomLineAmount, setInvoiceForm]);

  return {
    onLogout,
    userName,
    userRole,
    userClinicId,
    currentUserId,
    token,
    navigate,
    loadData,
    activeTab,
    setActiveTab,
    setAuxiliaryTab,
    activeNav,
    setPracticeNav,
    setAuxNav,
    skipNextUrlDerivedTabSync,
    showNotice,
    setShowNotice,
    notifyShort,
    showToast,
    patients,
    setPatients,
    appointments,
    setAppointments,
    prescriptions,
    invoices,
    setInvoices,
    labOrders,
    setLabOrders,
    dataLoading,
    apiError,
    setApiError,
    dashboardApiStats,
    dashboardRecentPatients,
    dashboardRevenueChart,
    dashboardAppointmentChart,
    searchQuery,
    setSearchQuery,
    patientSearchLoading,
    patientSortKey,
    patientSortDir,
    togglePatientSort,
    patientListPage,
    setPatientListPage,
    patientListPageSize,
    setPatientListPageSize,
    patientsSortedForList,
    patientListTotalPages,
    patientsPageSlice,
    appointmentScheduleFilter,
    setAppointmentScheduleFilter,
    appointmentViewMode,
    setAppointmentViewMode,
    setCalendarWeekOffset,
    filteredAppointments,
    todayAppointments,
    weekCalendarDays,
    billingInvoiceFilter,
    setBillingInvoiceFilter,
    filteredInvoicesForBilling,
    revenueToday,
    invoiceIsOverdue,
    rxWorkspace,
    stats,
    dashboardHeaderDraft,
    setDashboardHeaderDraft,
    dashboardPrintDraft,
    setDashboardPrintDraft,
    invoiceForm,
    setInvoiceForm,
    labForm,
    setLabForm,
    billingProcedures,
    customLineDescription,
    setCustomLineDescription,
    customLineAmount,
    setCustomLineAmount,
    handleAddCustomLine,
    handleCreateInvoice,
    handlePrintInvoice,
    handlePrintMushok63,
    handleCreateLabOrder,
    exportInvoicesCsv,
    markLabOrderDelivered,
    saveDashboardClinic,
    saveDashboardDoctor,
    saveDashboardPrint,
    drugSearch,
    setDrugSearch,
    filteredDrugs,
    superAdminTab,
    setSuperAdminTab,
    superAdminDoctorSearch,
    setSuperAdminDoctorSearch,
    superAdminPatientSearch,
    setSuperAdminPatientSearch,
    superAdminStats,
    superAdminClinics,
    superAdminRevenue,
    superAdminUtilization,
    superAdminLogs,
    superAdminDoctors,
    superAdminPatients,
    superAdminPrescriptions,
    superAdminLoading,
    superAdminPending,
    clinicAdminUsers,
    clinicAdminTotal,
    clinicAdminLoading,
    clinicAdminSearchInput,
    setClinicAdminSearchInput,
    clinicAdminPage,
    setClinicAdminPage,
    adminFilterClinicId,
    setAdminFilterClinicId,
    adminClinicOptions,
    newStaffForm,
    setNewStaffForm,
    approvePendingSignup,
    rejectPendingSignup,
    updateDoctorRow,
    updatePatientRow,
    updatePrescriptionRow,
    handleCreateStaffUser,
    handleToggleStaffActive,
    handleStaffRoleChange,
    appointmentForm,
    setAppointmentForm,
    editingAppointmentId,
    handleSendAppointmentReminder,
    handleConfirmAppointment,
    handleCancelAppointment,
    handleCompleteAppointment,
    handleAddAppointment,
    beginRescheduleAppointment,
    cancelAppointmentEditMode,
    exportAppointmentsCsv,
    downloadAppointmentIcs,
    getGoogleCalendarUrl,
    selectedPatient,
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
    startNewPrescriptionForPatient,
    toggleTooth,
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

export type PracticeWorkspaceControllerModel = ReturnType<typeof usePracticeWorkspaceControllerModel>;
