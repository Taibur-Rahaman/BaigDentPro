import React from 'react';
import { usePracticeWorkspaceView } from '@/contexts/practiceWorkspace/PracticeWorkspaceViewContext';

export function PrescriptionsPage() {
  const { setPracticeNav, rxWorkspace, prescriptions } = usePracticeWorkspaceView();

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-file-medical"></i> All Prescriptions
        </h1>
        <button type="button" className="btn-primary" onClick={() => setPracticeNav('prescription')}>
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
                  <button type="button" className="btn-icon" title="View">
                    <i className="fa-solid fa-eye"></i>
                  </button>
                  <button type="button" className="btn-icon" title="Print">
                    <i className="fa-solid fa-print"></i>
                  </button>
                  <button type="button" className="btn-icon" title="WhatsApp">
                    <i className="fa-brands fa-whatsapp"></i>
                  </button>
                  <button type="button" className="btn-icon" title="Email">
                    <i className="fa-solid fa-envelope"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prescriptions.length === 0 ? <p className="empty-state">No prescriptions yet</p> : null}
      </div>
    </div>
  );
}
