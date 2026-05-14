import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import api from '@/api';
import { PrescriptionPage } from '@/PrescriptionPage';
import { ShopUserDashboardPage } from '@/pages/ShopUserDashboardPage';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeDashboardBundle } from '@/hooks/view/usePracticeDashboardBundle';
import { usePatientsDirectoryView, type PatientSortKey } from '@/hooks/view/usePatientsDirectoryView';
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
import {
  DIAGNOSIS_OPTIONS,
  TREATMENT_OPTIONS,
  MEDICAL_HISTORY_DISPLAY_ORDER,
  MEDICAL_HISTORY_TEXT_DISPLAY,
  hasDisplayedMedicalHistory,
  TOOTH_CHART_FDI,
  TOOTH_CHART_UNIVERSAL,
  formatLocalYMD,
  parseAppointmentStartLocal,
} from '@/hooks/view/practiceWorkspaceShared';
import { prettifyAppointmentStatus } from '@/viewModels/formatters';
import { practiceWorkspaceHref } from '@/pages/practice/practiceNav';
import { PracticeOverviewPage } from '@/pages/practice/workspace/PracticeOverviewPage';
import { PracticeReportsPanel } from '@/pages/practice/workspace/PracticeReportsPanel';
import { OperationsCalendarPage } from '@/pages/dashboard/OperationsCalendarPage';
import { ClinicPracticeSidebar } from '@/components/practiceWorkspace/ClinicPracticeSidebar';
import { StarterPracticeSidebar } from '@/components/practiceWorkspace/StarterPracticeSidebar';
import { useSiteLogo } from '@/hooks/useSiteLogo';
import { PatientTimelinePanel } from '@/components/PatientTimelinePanel';
import {
  SuperAdminPendingApprovalsTable,
  type PendingRow,
} from '@/components/superAdmin/SuperAdminPendingApprovalsTable';
import { SuperAdminCapabilityOverridesPanel } from '@/features/superAdmin/SuperAdminCapabilityOverridesPanel';

interface Props {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userClinicId?: string;
  currentUserId?: string;
  /** Starter staff use an isolated sidebar source; clinic/platform use full practice nav. */
  practiceSidebarVariant?: 'starter' | 'clinic';
}

export const PracticeWorkspaceController: React.FC<Props> = ({
  onLogout,
  userName = 'Doctor',
  userRole,
  userClinicId,
  currentUserId,
  practiceSidebarVariant = 'clinic',
}) => {
  const { token } = useAuth();
  const siteLogo = useSiteLogo();
  const {
    patients,
    setPatients,
    appointments,
    setAppointments,
    prescriptions,
    setPrescriptions: _setPrescriptions,
    invoices,
    setInvoices,
    labOrders,
    setLabOrders,
    dataLoading,
    apiError,
    setApiError,
    dashboardApiStats,
    setDashboardApiStats: _setDashboardApiStats,
    dashboardRecentPatients,
    setDashboardRecentPatients: _setDashboardRecentPatients,
    dashboardRevenueChart,
    setDashboardRevenueChart: _setDashboardRevenueChart,
    dashboardAppointmentChart,
    setDashboardAppointmentChart: _setDashboardAppointmentChart,
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

  const isDev =
    import.meta.env.DEV || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
  useEffect(() => {
    if (!isDev) return;
    if ((userRole ?? '').trim() === 'DOCTOR' && practiceSidebarVariant !== 'starter') {
      console.error(
        '[BaigDentPro] Doctor users must mount PracticeWorkspaceController with practiceSidebarVariant="starter".',
      );
    }
  }, [isDev, userRole, practiceSidebarVariant]);

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
    _newBillingProcedure,
    _setNewBillingProcedure,
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
    demoResetLoading,
    resetDemoData,
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
    setSelectedPatient: _setSelectedPatient,
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

  const renderSidebar = () => {
    if (practiceSidebarVariant === 'starter') {
      return (
        <StarterPracticeSidebar
          userName={userName}
          userRole={userRole}
          activeNav={activeNav}
          siteLogo={siteLogo}
          onLogout={onLogout}
        />
      );
    }
    return (
      <ClinicPracticeSidebar
        userName={userName}
        userRole={userRole}
        activeNav={activeNav}
        siteLogo={siteLogo}
        onLogout={onLogout}
        setAuxNav={setAuxNav}
      />
    );
  };

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
            {token && patientSearchLoading && searchQuery.trim() ? (
              <span className="patient-search-hint" style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>
                Searching…
              </span>
            ) : null}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => exportPatientsListCsv(patientsSortedForList)}
              disabled={patientsSortedForList.length === 0}
            >
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
                <div className="empty-state" style={{ padding: 22, textAlign: 'center' }}>
                  <p style={{ position: 'relative', zIndex: 1, marginBottom: patients.length === 0 && !searchQuery.trim() ? 14 : 0 }}>{emptyMessage}</p>
                  {patients.length === 0 && !searchQuery.trim() && !showLoading ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const el = document.querySelector<HTMLInputElement>('.dashboard-card .card-body input.input[placeholder="Patient name *"]');
                        el?.focus();
                      }}
                    >
                      <i className="fa-solid fa-user-plus" /> Register your first patient
                    </button>
                  ) : null}
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

  const renderPatientDetail = () => {
    if (!selectedPatient) return null;
    const totals = calculateTotals();
    const treatmentPlansTotalTk = treatmentPlans.reduce((sum, p) => sum + (parseFloat(String(p.cost)) || 0), 0);

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <button className="btn-back" onClick={() => setPracticeNav('patients')}>
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
              <button className="btn-secondary" onClick={() => { setAppointmentForm({ ...appointmentForm, patientId: selectedPatient.id }); setPracticeNav('appointments'); }}>
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
                  <div className="tooth-surfaces-panel">
                    <p className="tooth-surfaces-hint">
                      Surfaces (M/D/O/B/L) — click to cycle Caries → Filled → Crown → clear
                    </p>
                    {selectedTeeth.slice(0, 16).map((tooth) => (
                      <div key={tooth} className="tooth-surface-row">
                        <span className="tooth-surface-label">{tooth}</span>
                        {(['M', 'D', 'O', 'B', 'L'] as const).map((s) => {
                          const st = dentalChartRows.find((r) => r.toothNumber === tooth)?.surfaces?.[s];
                          return (
                            <button
                              key={s}
                              type="button"
                              className={`surface-chip ${st ? 'surface-chip--active' : ''}`}
                              title={st || 'Sound'}
                              onClick={() => void handleDentalSurfaceToggle(tooth, s)}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    ))}
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
                className={`profile-tab ${patientProfileTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setPatientProfileTab('timeline')}
              >
                <i className="fa-solid fa-clock-rotate-left"></i> Timeline
              </button>
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
                <i className="fa-solid fa-book"></i> Treatment payment history
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

            {patientProfileTab === 'timeline' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Patient timeline — {selectedPatient.name}</h3>
                  <p className="empty-state-sm" style={{ margin: '4px 0 0' }}>
                    Appointments, treatment plans, treatments, invoices, prescriptions, and lab orders (newest first).
                  </p>
                </div>
                <PatientTimelinePanel events={timelineEvents} loading={timelineLoading} />
              </div>
            )}

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

            {/* Treatment payment history (clinical statement — not general ledger) */}
            {patientProfileTab === 'ledger' && (
              <div className="tab-content">
                <div className="tab-header">
                  <h3>Treatment payment history — {selectedPatient.name}</h3>
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
                    <button className="btn-primary" type="button" onClick={() => void persistPatientProfileDraft()}>
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
              <form onSubmit={handleSaveConsentLocal} className="consent-form">
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

  const renderPrescriptionsList = () => (
    <div className="dashboard-content">
      <div className="page-header">
        <h1><i className="fa-solid fa-file-medical"></i> All Prescriptions</h1>
        <button className="btn-primary" onClick={() => setPracticeNav('prescription')}>
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
            {rxWorkspace.prescriptionsSorted.map((rx) => (
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
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentViewMode === 'list' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentViewMode('list')}
          >
            List
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${appointmentViewMode === 'week' ? 'billing-filter-active' : ''}`}
            onClick={() => setAppointmentViewMode('week')}
          >
            Week view
          </button>
        </div>
      </div>

      {appointmentViewMode === 'week' ? (
        <div className="dashboard-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>
              <i className="fa-solid fa-calendar-week" /> Weekly grid (Mon–Sun)
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset((x) => x - 1)}>
                ← Prev week
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset(0)}>
                This week
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset((x) => x + 1)}>
                Next week →
              </button>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 10,
              minHeight: 200,
            }}
          >
            {weekCalendarDays.map((ymd) => {
              const dayAppts = filteredAppointments.filter((a) => a.date === ymd);
              const [cy, cm, cd] = ymd.split('-').map((x) => parseInt(x, 10));
              const d = new Date(cy, (cm || 1) - 1, cd || 1);
              const isTodayCell = ymd === formatLocalYMD(new Date());
              return (
                <div
                  key={ymd}
                  style={{
                    border: `1px solid ${isTodayCell ? 'rgba(59,130,246,0.85)' : 'rgba(148,163,184,0.45)'}`,
                    borderRadius: 10,
                    padding: 10,
                    background: isTodayCell ? 'rgba(59,130,246,0.06)' : 'rgba(248,250,252,0.9)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--neo-text-muted)', marginBottom: 8 }}>
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                    <br />
                    <span style={{ fontSize: '1.05rem', color: '#0f172a' }}>{d.getDate()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayAppts.length === 0 ? (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>—</span>
                    ) : (
                      dayAppts.map((apt) => {
                        const st = String(apt.status || '').toUpperCase();
                        const done = st === 'COMPLETED';
                        const upcoming = ['SCHEDULED', 'CONFIRMED'].includes(st);
                        return (
                          <div key={apt.id} style={{ fontSize: '0.72rem', lineHeight: 1.35, padding: '6px 6px', borderRadius: 8, background: 'white', border: '1px solid rgba(226,232,240,0.9)' }}>
                            <strong>{apt.time}</strong> {apt.patientName}
                            <div style={{ marginTop: 4 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  borderRadius: 999,
                                  padding: '2px 6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  background: done ? 'rgba(16,185,129,0.15)' : upcoming ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.2)',
                                  color: done ? '#065f46' : upcoming ? '#1e40af' : '#334155',
                                }}
                              >
                                {prettifyAppointmentStatus(apt.status)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="appointments-page-card">
        <div className="appointments-inner-grid">
        <div className="form-panel appointments-form-panel">
          <h3><i className="fa-solid fa-calendar-plus"></i> {editingAppointmentId ? 'Edit / reschedule appointment' : 'Appointment details'}</h3>
          {editingAppointmentId ? (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--neo-text-muted)' }}>
              Rescheduling an existing visit — update fields and save.
            </p>
          ) : null}
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

            <div className="appointments-field appointments-field-action" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn-primary appointments-schedule-btn" onClick={handleAddAppointment} type="button">
                <i className="fa-solid fa-plus" aria-hidden="true"></i>{' '}
                {editingAppointmentId ? 'Save changes' : 'Schedule appointment'}
              </button>
              {editingAppointmentId ? (
                <button type="button" className="btn-secondary appointments-schedule-btn" onClick={cancelAppointmentEditMode}>
                  Cancel editing
                </button>
              ) : null}
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

                  {(String(apt.status || '').toUpperCase() === 'SCHEDULED' ||
                    String(apt.status || '').toUpperCase() === 'CONFIRMED') &&
                  token ? (
                    <button
                      className="apt-action-btn"
                      title="Load this appointment into the form to reschedule"
                      type="button"
                      onClick={() => beginRescheduleAppointment(apt)}
                    >
                      <i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
                      Reschedule
                    </button>
                  ) : null}

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
                            onClick={() => void markLabOrderDelivered(order.id)}
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
                void api.tenantProducts
                  .uploadImage(file, 'clinicLogo')
                  .then((url: string) => {
                    const stamped = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
                    setDashboardHeaderDraft((prev) => ({ ...prev, clinicLogo: stamped }));
                  })
                  .catch(() => notifyShort('Failed to upload clinic logo.'));
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
          <button className="btn-primary" type="button" onClick={saveDashboardClinic}>
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
                void api.tenantProducts
                  .uploadImage(file, 'doctorLogo')
                  .then((url: string) => {
                    const stamped = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
                    setDashboardHeaderDraft((prev) => ({ ...prev, doctorLogo: stamped }));
                  })
                  .catch(() => notifyShort('Failed to upload doctor logo.'));
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
          <button className="btn-primary" type="button" onClick={saveDashboardDoctor}>
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
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'A4' || v === 'A5' || v === 'Letter') {
                  setDashboardPrintDraft({ ...dashboardPrintDraft, paperSize: v });
                }
              }}
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
          <button className="btn-primary" type="button" onClick={saveDashboardPrint}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderClinicAdmin = () => {
    if (!token) {
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
      { id: 'capabilities' as const, label: 'Capabilities', icon: 'fa-sliders' },
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
        <div className="dashboard-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1><i className="fa-solid fa-shield-halved"></i> Super Admin Panel</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Separate platform portal to manage doctors, patients, and prescriptions globally
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={demoResetLoading}
            title="Clears and reseeds data for all demo clinics only"
            onClick={() => void resetDemoData()}
          >
            {demoResetLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Resetting demo…
              </>
            ) : (
              <>
                <i className="fa-solid fa-rotate-left" aria-hidden /> Reset demo data
              </>
            )}
          </button>
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
              <SuperAdminPendingApprovalsTable
                pending={superAdminPending as PendingRow[]}
                showToast={showToast}
                onApprove={(userId, payload) => approvePendingSignup(userId, payload)}
                onReject={(userId) => rejectPendingSignup(userId)}
              />
            </div>
          </div>
        ) : superAdminTab === 'capabilities' ? (
          <SuperAdminCapabilityOverridesPanel clinics={superAdminClinics} showToast={showToast} />
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
                              await updateDoctorRow(d.id, {
                                name: name.trim(),
                                phone: phone.trim(),
                                clinicName: clinicName.trim(),
                                role: roleInput.trim().toUpperCase() as 'DOCTOR' | 'CLINIC_ADMIN',
                                isActive: activeInput.trim().toLowerCase() !== 'disabled',
                              });
                            } catch (e: unknown) {
                              showToast((e as { message?: string })?.message ?? 'Failed to update doctor');
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
                              await updatePatientRow(p.id, {
                                name: name.trim(),
                                phone: phone.trim(),
                                age: ageInput.trim() === '' ? null : Number(ageInput),
                              });
                            } catch (e: unknown) {
                              showToast((e as { message?: string })?.message ?? 'Failed to update patient');
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
                              await updatePrescriptionRow(pr.id, {
                                diagnosis,
                                advice,
                                followUpDate: followUp.trim() ? followUp.trim() : null,
                              });
                            } catch (e: unknown) {
                              showToast((e as { message?: string })?.message ?? 'Failed to update prescription');
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
    const overviewEl = (
      <PracticeOverviewPage
        userName={userName}
        dashboardApiStats={dashboardApiStats}
        stats={stats}
        revenueToday={revenueToday}
        dashboardRevenueChart={dashboardRevenueChart}
        dashboardAppointmentChart={dashboardAppointmentChart}
        todayAppointments={todayAppointments}
        patients={patients}
        dashboardRecentPatients={dashboardRecentPatients}
        labOrders={labOrders}
        selectPatientForView={selectPatientForView}
        setPracticeNav={setPracticeNav}
        setBillingInvoiceFilter={setBillingInvoiceFilter}
        startNewPrescriptionForPatient={startNewPrescriptionForPatient}
      />
    );
    switch (activeNav) {
      case 'dashboard':
        return overviewEl;
      case 'clinic-calendar':
        return <OperationsCalendarPage />;
      case 'practice-reports':
        return <PracticeReportsPanel />;
      case 'shop-dashboard': return <ShopUserDashboardPage />;
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
      default:
        return overviewEl;
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
        <Outlet />
      </main>
      {showNotice && (
        <div className="toast-notification">
          <i className="fa-solid fa-check-circle"></i> {showNotice}
        </div>
      )}
    </div>
  );
};

export default PracticeWorkspaceController;
