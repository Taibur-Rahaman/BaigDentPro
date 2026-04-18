import React, { useState } from 'react';
import api from '@/api';
import { useAuth } from '@/hooks/useAuth';

export const InvitesPage: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'DOCTOR' | 'RECEPTIONIST' | 'ADMIN'>('DOCTOR');
  const [clinicId, setClinicId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const body: {
        email: string;
        role: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN';
        clinicId?: string;
      } = {
        email: email.trim(),
        role,
      };
      if (user?.role === 'SUPER_ADMIN' && clinicId.trim()) {
        body.clinicId = clinicId.trim();
      }
      const res = await api.invite.create(body);
      setMessage(`Invite sent. Link: ${res.acceptUrl}`);
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tenant-page">
      <h1 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Invite staff</h1>
      <p style={{ color: 'var(--neo-text-muted, #64748b)', marginTop: 0 }}>
        Sends an email with a secure link to join this clinic.
      </p>
      {user?.role === 'SUPER_ADMIN' ? (
        <p style={{ fontSize: 14 }}>
          <label className="neo-field">
            <span>Target clinic id</span>
            <input value={clinicId} onChange={(e) => setClinicId(e.target.value)} placeholder="Required for super admin" />
          </label>
        </p>
      ) : null}
      <form onSubmit={(e) => void submit(e)} className="neo-stack" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
        <label className="neo-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="neo-field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="DOCTOR">Doctor</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="ADMIN">Clinic admin</option>
          </select>
        </label>
        {error ? (
          <p style={{ color: '#b91c1c' }} role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p style={{ color: '#15803d' }}>{message}</p> : null}
        <button type="submit" className="neo-btn neo-btn-primary" disabled={busy}>
          {busy ? 'Sending…' : 'Send invite'}
        </button>
      </form>
    </div>
  );
};
