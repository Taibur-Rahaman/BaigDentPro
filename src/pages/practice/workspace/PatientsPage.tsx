import React from 'react';
import type { PatientSortKey } from '@/hooks/view/usePatientsDirectoryView';
import { usePracticeWorkspaceView } from '@/contexts/practiceWorkspace/PracticeWorkspaceViewContext';

export function PatientsPage() {
  const {
    token,
    dataLoading,
    patients,
    searchQuery,
    setSearchQuery,
    patientSearchLoading,
    togglePatientSort,
    patientSortKey,
    patientSortDir,
    patientListPageSize,
    setPatientListPageSize,
    patientListPage,
    setPatientListPage,
    patientsSortedForList,
    patientListTotalPages,
    patientsPageSlice,
    patientForm,
    setPatientForm,
    exportPatientsListCsv,
    selectPatientForView,
    selectPatientForPrescription,
    handleDeletePatient,
    handleAddPatient,
  } = usePracticeWorkspaceView();
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
}
