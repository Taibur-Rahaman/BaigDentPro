import React from 'react';
import { Link } from 'react-router-dom';
import { useAcceptInviteView } from '@/hooks/view/useAcceptInviteView';

export const AcceptInvitePage: React.FC = () => {
  const { token, name, setName, password, setPassword, preview, error, busy, submit } = useAcceptInviteView();

  return (
    <div className="tenant-page" style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Accept invitation</h1>
      {preview ? (
        <p style={{ color: 'var(--neo-text-muted, #64748b)', marginTop: 0 }}>
          Join <strong>{preview.clinicName}</strong> as <strong>{preview.role}</strong> —{' '}
          <span>{preview.emailMasked}</span>
        </p>
      ) : null}
      {error ? (
        <p style={{ color: '#b91c1c', marginBottom: 16 }} role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={(e) => void submit(e)} className="neo-stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="neo-field">
          <span>Full name</span>
          <input value={name} onChange={(ev) => setName(ev.target.value)} required minLength={1} maxLength={200} />
        </label>
        <label className="neo-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="neo-btn neo-btn-primary" disabled={busy || !token}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p style={{ marginTop: 24 }}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
};
