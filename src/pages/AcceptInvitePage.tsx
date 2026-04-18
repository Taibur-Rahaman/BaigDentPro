import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/api';

export const AcceptInvitePage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token')?.trim() ?? '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<{ clinicName: string; emailMasked: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invite token.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.invite.preview(token);
        if (!cancelled) setPreview(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Invite could not be loaded.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await api.invite.accept({ token, name: name.trim(), password });
      navigate('/login', { replace: true, state: { message: 'Account created. Sign in with your email and password.' } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not accept invite');
    } finally {
      setBusy(false);
    }
  };

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
