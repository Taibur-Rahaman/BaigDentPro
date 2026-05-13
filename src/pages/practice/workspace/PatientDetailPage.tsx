import React from 'react';
import {
  DIAGNOSIS_OPTIONS,
  TREATMENT_OPTIONS,
  MEDICAL_HISTORY_DISPLAY_ORDER,
  MEDICAL_HISTORY_TEXT_DISPLAY,
  hasDisplayedMedicalHistory,
  TOOTH_CHART_FDI,
  TOOTH_CHART_UNIVERSAL,
} from '@/hooks/view/practiceWorkspaceShared';
import { usePracticeWorkspaceView } from '@/contexts/practiceWorkspace/PracticeWorkspaceViewContext';

export function PatientDetailPage() {
  const {
    appointmentForm,
    appointments: _appointments,
    calculateTotals,
    chiefComplaint,
    clinicalFindings,
    consent,
    diagnosis,
    editingPlan,
    editingRecord,
    handleDeleteTreatmentPlan,
    handleDeleteTreatmentRecord,
    handleSaveConsentLocal,
    handleSaveMedicalHistory,
    handleSaveTreatmentPlan,
    handleSaveTreatmentRecord,
    investigation,
    medicalHistory,
    openPatientRecordFormPrint,
    patientProfileTab,
    patientRecordForm,
    patients: _patients,
    paymentCostInput,
    paymentDuePreview,
    paymentPaidInput,
    persistPatientProfileDraft,
    selectPatientForPrescription,
    selectedPatient,
    selectedTeeth,
    setAppointmentForm,
    setChiefComplaint,
    setClinicalFindings,
    setDiagnosis,
    setEditingPlan,
    setEditingRecord,
    setInvestigation,
    setPatientProfileTab,
    setPatientRecordForm,
    setPaymentCostInput,
    setPaymentPaidInput,
    setPracticeNav,
    setSelectedTeeth,
    setShowConsentModal,
    setShowMedicalHistoryModal,
    setShowTreatmentPlanModal,
    setShowTreatmentRecordModal,
    setToothNumberingSystem,
    showConsentModal,
    showMedicalHistoryModal,
    showTreatmentPlanModal,
    showTreatmentRecordModal,
    toggleTooth,
    toothNumberingSystem,
    treatmentPlans,
    treatmentRecords
  } = usePracticeWorkspaceView();


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

}
