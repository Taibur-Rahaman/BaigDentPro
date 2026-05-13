import React, { useState } from 'react';
import { usePatientPortalAppointmentsView } from '@/hooks/view/usePatientPortalAppointmentsView';

export const PatientPortalBookAppointmentPage: React.FC = () => {
  const { appointments, loading, error, busyId, book, cancel } = usePatientPortalAppointmentsView(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  return (
    <div className="patient-portal-root">
      <h1 className="pp-title">Appointments</h1>
      <p className="pp-muted">Request a visit; clinic staff may adjust the slot.</p>

      <div className="pp-card">
        <h2 className="pp-title" style={{ fontSize: '1rem' }}>
          Book
        </h2>
        <label className="pp-field">
          <span>Preferred date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="pp-field">
          <span>Preferred time</span>
          <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="10:00" />
        </label>
        <label className="pp-field">
          <span>Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <button
          type="button"
          className="pp-btn pp-btn-primary"
          disabled={busyId === 'new'}
          onClick={() => void book({ date, time, notes })}
        >
          {busyId === 'new' ? 'Booking…' : 'Request appointment'}
        </button>
      </div>

      {error ? (
        <p style={{ color: '#b91c1c' }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="pp-muted">Loading list…</p> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {appointments.map((a) => (
          <div key={a.id} className="pp-card">
            <div className="pp-row-between">
              <span>{new Date(a.date).toLocaleDateString()}</span>
              <span style={{ fontSize: '0.85rem' }}>{a.time}</span>
            </div>
            <div className="pp-muted" style={{ fontSize: '0.8rem' }}>
              {a.status}
            </div>
            {a.status === 'SCHEDULED' ? (
              <button
                type="button"
                className="pp-btn pp-btn-ghost"
                style={{ marginTop: 6, padding: 0 }}
                disabled={busyId === a.id}
                onClick={() => void cancel(a.id)}
              >
                {busyId === a.id ? 'Cancelling…' : 'Cancel'}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
