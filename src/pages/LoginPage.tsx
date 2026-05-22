import React, { useEffect, useRef, useState } from 'react';
import api from '@/api';
import { AUTH_LOGIN_TIMEOUT_MS } from '@/config/api';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginLocationState } from '@/hooks/useLoginLocationState';
import { useAuth } from '@/hooks/useAuth';
import { loginErrorMessageForUser } from '@/lib/apiErrors';
import { resolveLoginDestination } from '@/lib/postAuthDashboardPath';
import { IdleSessionReturnedModal } from '@/components/IdleSessionReturnedModal';
import { consumeIdleLogoutMarker } from '@/lib/idleSessionLogout';
import { fetchApiHealthSnapshot, loginBlockedMessage } from '@/lib/apiHealthPreflight';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { from, flash } = useLoginLocationState();
  const { login, isAuthenticated, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showIdleReturnModal, setShowIdleReturnModal] = useState(false);
  const [apiHealthBlocked, setApiHealthBlocked] = useState<string | null>(null);
  const loginAbortRef = useRef<AbortController | null>(null);
  const LOGIN_UI_MAX_MS = AUTH_LOGIN_TIMEOUT_MS + 3_000;

  useEffect(() => {
    api.session.clearForCredentialLogin();
  }, []);

  useEffect(() => {
    if (consumeIdleLogoutMarker()) {
      setShowIdleReturnModal(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated && api.session.getAccessToken()) {
      navigate(resolveLoginDestination(user, from), { replace: true });
    }
  }, [loading, isAuthenticated, navigate, from, user]);

  useEffect(() => {
    return () => {
      loginAbortRef.current?.abort();
    };
  }, []);

  /** Hard cap — never leave “Signing in…” forever (even if an old bundle lacks fetch timeout). */
  useEffect(() => {
    if (!submitting) return undefined;
    const id = window.setTimeout(() => {
      loginAbortRef.current?.abort();
      setSubmitting(false);
      setError('Sign-in took too long. Refresh the page, then try again.');
    }, LOGIN_UI_MAX_MS);
    return () => window.clearTimeout(id);
  }, [submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    loginAbortRef.current?.abort();
    const controller = new AbortController();
    loginAbortRef.current = controller;

    if (apiHealthBlocked) {
      setError(apiHealthBlocked);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const signedIn = await login(email, password, { signal: controller.signal });
      if (controller.signal.aborted) return;
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
      navigate(resolveLoginDestination(signedIn, from), { replace: true });
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(loginErrorMessageForUser(err));
    } finally {
      if (loginAbortRef.current === controller) {
        loginAbortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setSubmitting(false);
      }
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
          {apiHealthBlocked && !error ? (
            <div className="neo-auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              <span>{apiHealthBlocked}</span>
            </div>
          ) : null}
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
                  disabled={submitting}
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
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg"
              disabled={submitting || Boolean(apiHealthBlocked)}
              aria-busy={submitting}
            >
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
            {submitting ? (
              <p className="neo-auth-hint" style={{ marginTop: 10, fontSize: 13, color: 'var(--neo-text-muted)' }}>
                This usually takes a few seconds. The form will reset automatically if the server is slow.
              </p>
            ) : null}
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
