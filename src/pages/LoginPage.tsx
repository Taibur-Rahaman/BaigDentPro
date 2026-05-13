import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginLocationState } from '@/hooks/useLoginLocationState';
import { useAuth } from '@/hooks/useAuth';
import { loginErrorMessageForUser } from '@/lib/apiErrors';
import { resolveLoginDestination } from '@/lib/postAuthDashboardPath';
import { IdleSessionReturnedModal } from '@/components/IdleSessionReturnedModal';
import { consumeIdleLogoutMarker } from '@/lib/idleSessionLogout';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { from, flash } = useLoginLocationState();
  const { login, isAuthenticated, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showIdleReturnModal, setShowIdleReturnModal] = useState(false);

  useEffect(() => {
    if (consumeIdleLogoutMarker()) {
      setShowIdleReturnModal(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(resolveLoginDestination(user, from), { replace: true });
    }
  }, [loading, isAuthenticated, navigate, from, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      navigate(resolveLoginDestination(signedIn, from), { replace: true });
    } catch (err: unknown) {
      setError(loginErrorMessageForUser(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="neo-auth" style={{ minHeight: '100vh' }}>
      <IdleSessionReturnedModal open={showIdleReturnModal} onDismiss={() => setShowIdleReturnModal(false)} />
      <div className="neo-bg-grid" />
      <div className="neo-bg-glow neo-bg-glow-1" />
      <div className="neo-bg-glow neo-bg-glow-2" />
      <div className="neo-auth-container neo-auth-container--solo">
        <div className="neo-auth-card">
          {flash ? (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(21, 128, 61, 0.12)',
                color: '#166534',
                fontSize: 14,
              }}
              role="status"
            >
              {flash}
            </div>
          ) : null}
          <div className="neo-auth-card-header">
            <h2>Staff sign in</h2>
            <p>Enter the email and password for your BaigDentPro account.</p>
          </div>
          {error ? (
            <div className="neo-auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              <span>{error}</span>
            </div>
          ) : null}
          <form onSubmit={(e) => void handleSubmit(e)} className="neo-auth-form">
            <div className="neo-form-group">
              <label htmlFor="login-email">Email</label>
              <div className="neo-input-wrapper">
                <i className="fa-solid fa-envelope" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="neo-form-group">
              <label htmlFor="login-password">Password</label>
              <div className="neo-input-wrapper">
                <i className="fa-solid fa-lock" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={submitting || loading}>
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden />
                  <span>Sign in</span>
                </>
              )}
            </button>
            <div className="neo-auth-subfooter">
              <p className="neo-auth-switch" style={{ marginTop: 0 }}>
                Need an account? <Link to="/signup">Create an account</Link>
              </p>
              <nav className="neo-auth-foot-nav" aria-label="Other pages">
                <Link to="/staff-portal">Clinic portal login</Link>
                <span className="neo-auth-foot-dot" aria-hidden>
                  ·
                </span>
                <Link to="/">Home</Link>
              </nav>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
