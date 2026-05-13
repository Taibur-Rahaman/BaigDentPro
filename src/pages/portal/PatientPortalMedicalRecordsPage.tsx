import React from 'react';
import { usePatientPortalProfileView } from '@/hooks/view/usePatientPortalProfileView';

export const PatientPortalMedicalRecordsPage: React.FC = () => {
  const { profile, sections, loading, error } = usePatientPortalProfileView(true);

  return (
    <div className="patient-portal-root">
      <h1 className="pp-title">Medical records</h1>
      <p className="pp-muted">Read-only summary from your clinic (offline cache when connection drops).</p>
      {loading ? <p className="pp-muted">Loading…</p> : null}
      {error ? (
        <p style={{ color: '#b91c1c' }} role="alert">
          {error}
        </p>
      ) : null}
      {profile ? (
        <div className="pp-card">
          <div className="pp-row-between">
            <span>Patient</span>
            <strong style={{ fontSize: '0.9rem' }}>{profile.name}</strong>
          </div>
        </div>
      ) : null}
      {sections.map((s) => (
        <div key={s.title} className="pp-card">
          <h2 className="pp-title" style={{ fontSize: '1rem' }}>
            {s.title}
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
            {s.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
