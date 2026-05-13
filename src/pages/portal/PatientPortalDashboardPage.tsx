import React from 'react';
import { usePatientPortalProfileView } from '@/hooks/view/usePatientPortalProfileView';
import { usePatientPortalAuth } from '@/pages/portal/PatientPortalAuthContext';

export const PatientPortalDashboardPage: React.FC = () => {
  const { patientName, logout } = usePatientPortalAuth();
  const { profile, loading, error, sections } = usePatientPortalProfileView(true);

  return (
    <div className="patient-portal-root">
      <div className="pp-row-between" style={{ marginBottom: '0.75rem' }}>
        <h1 className="pp-title" style={{ margin: 0 }}>
          Hello{patientName ? `, ${patientName}` : ''}
        </h1>
        <button type="button" className="pp-btn pp-btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>
      {loading ? <p className="pp-muted">Loading profile…</p> : null}
      {error ? (
        <p style={{ color: '#b91c1c' }} role="alert">
          {error}
        </p>
      ) : null}
      {profile ? (
        <div className="pp-card">
          <div className="pp-row-between">
            <span>Clinic</span>
            <strong style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{profile.clinicId}</strong>
          </div>
          <div className="pp-row-between" style={{ marginTop: 8 }}>
            <span>Phone</span>
            <strong style={{ fontSize: '0.85rem' }}>{profile.phone}</strong>
          </div>
        </div>
      ) : null}
      {sections.length > 0 ? (
        <div className="pp-card">
          <h2 className="pp-title" style={{ fontSize: '1rem' }}>
            Medical flags (summary)
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
            {sections.flatMap((s) => s.lines.map((l) => <li key={`${s.title}-${l}`}>{l}</li>))}
          </ul>
        </div>
      ) : !loading ? (
        <p className="pp-muted">No medical alerts on file (or empty summary).</p>
      ) : null}
    </div>
  );
};
