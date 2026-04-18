import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type AuthLoginMode } from '@/hooks/useAuth';
import { isApiHttpError } from '@/lib/apiErrors';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; message?: string } | null)?.from || '/dashboard';
  const flash = (location.state as { message?: string } | null)?.message;
  const { login, isAuthenticated, loading, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<AuthLoginMode>(() => (isSupabaseConfigured ? 'supabase' : 'api'));

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [loading, isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, { mode: loginMode });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(isApiHttpError(err) ? err.message : err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="neo-auth" style={{ minHeight: '100vh' }}>
      <div className="neo-bg-grid" />
      <div className="neo-bg-glow neo-bg-glow-1" />
      <div className="neo-bg-glow neo-bg-glow-2" />
      <div className="neo-auth-container" style={{ maxWidth: 440, margin: '0 auto', padding: '2rem 1rem' }}>
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
            <h2>Sign in</h2>
            <p>
              {loginMode === 'supabase'
                ? 'Use your Supabase account email and password.'
                : 'Use your BaigDentPro email and password (API issues a JWT for the dashboard).'}
            </p>
          </div>
          {isSupabaseConfigured ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className={loginMode === 'supabase' ? 'neo-btn neo-btn-primary' : 'neo-btn neo-btn-secondary'}
                onClick={() => setLoginMode('supabase')}
              >
                Supabase
              </button>
              <button
                type="button"
                className={loginMode === 'api' ? 'neo-btn neo-btn-primary' : 'neo-btn neo-btn-secondary'}
                onClick={() => setLoginMode('api')}
              >
                API / JWT
              </button>
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
                  <i className="fa-solid fa-arrow-right-to-bracket" />
                  <span>Sign in</span>
                </>
              )}
            </button>
            <p className="neo-auth-switch">
              No account? <Link to="/signup">Create one</Link>
            </p>
            <p className="neo-auth-switch">
              <Link to="/portal">Clinic portal</Link> · <Link to="/">Home</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
