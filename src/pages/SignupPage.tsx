import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isApiHttpError } from '@/lib/apiErrors';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup, isSupabaseConfigured, registerSaasTenant } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saasName, setSaasName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signupChannel, setSignupChannel] = useState<'supabase' | 'saas'>(() => (isSupabaseConfigured ? 'supabase' : 'saas'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const result = await signup(email, password);
      if (result.needsEmailConfirmation) {
        setInfo(result.message || 'Check your email to confirm your account.');
      } else {
        setInfo('Account created. You can sign in now.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaaSSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await registerSaasTenant({
        email: email.trim(),
        password,
        name: saasName.trim() || undefined,
      });
      setInfo('Account created. If approval is required, sign in after approval.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      setError(isApiHttpError(err) ? err.message : err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="neo-auth" style={{ minHeight: '100vh' }}>
        <div className="neo-bg-grid" />
        <div className="neo-bg-glow neo-bg-glow-1" />
        <div className="neo-auth-container neo-auth-container--solo">
          <div className="neo-auth-card">
            <div className="neo-auth-card-header">
              <h2>Create account</h2>
              <p>
                Start your clinic profile here. If you need approval-based onboarding, use{' '}
                <Link to="/staff-portal">clinic portal registration</Link>
                {' '}
                instead.
              </p>
            </div>
            {error ? (
              <div className="neo-auth-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" />
                <span>{error}</span>
              </div>
            ) : null}
            {info ? (
              <div className="neo-auth-info-box" style={{ marginBottom: 16 }}>
                <p style={{ margin: 0 }}>{info}</p>
              </div>
            ) : null}
            <form onSubmit={(e) => void handleSaaSSignup(e)} className="neo-auth-form">
              <div className="neo-form-group">
                <label htmlFor="saas-name">Display name</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-user" />
                  <input
                    id="saas-name"
                    type="text"
                    value={saasName}
                    onChange={(e) => setSaasName(e.target.value)}
                    placeholder="Your name or practice"
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="saas-email">Email</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-envelope" />
                  <input
                    id="saas-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="saas-password">Password</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-lock" />
                  <input
                    id="saas-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus" />
                    <span>Create account</span>
                  </>
                )}
              </button>
              <div className="neo-auth-subfooter">
                <p className="neo-auth-switch" style={{ marginTop: 0 }}>
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
                <nav className="neo-auth-foot-nav" aria-label="Other pages">
                  <Link to="/staff-portal">Clinic portal</Link>
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
  }

  return (
    <div className="neo-auth" style={{ minHeight: '100vh' }}>
      <div className="neo-bg-grid" />
      <div className="neo-bg-glow neo-bg-glow-1" />
      <div className="neo-auth-container neo-auth-container--solo">
        <div className="neo-auth-card">
          <div className="neo-auth-card-header">
            <h2>Create account</h2>
            <p>
              {signupChannel === 'supabase'
                ? 'Sign up with Supabase Auth (email + password).'
                : 'Sign up with BaigDentPro API (stable /auth/register route).'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={signupChannel === 'supabase' ? 'neo-btn neo-btn-primary' : 'neo-btn neo-btn-secondary'}
              onClick={() => {
                setSignupChannel('supabase');
                setError('');
                setInfo('');
              }}
            >
              Supabase
            </button>
            <button
              type="button"
              className={signupChannel === 'saas' ? 'neo-btn neo-btn-primary' : 'neo-btn neo-btn-secondary'}
              onClick={() => {
                setSignupChannel('saas');
                setError('');
                setInfo('');
              }}
            >
              API
            </button>
          </div>
          {error ? (
            <div className="neo-auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              <span>{error}</span>
            </div>
          ) : null}
          {info ? (
            <div className="neo-auth-info-box" style={{ marginBottom: 16 }}>
              <div className="neo-auth-info-icon">
                <i className="fa-solid fa-envelope-circle-check" />
              </div>
              <div className="neo-auth-info-content">
                <p style={{ margin: 0 }}>{info}</p>
              </div>
            </div>
          ) : null}
          {signupChannel === 'supabase' ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="neo-auth-form">
              <div className="neo-form-group">
                <label htmlFor="signup-email">Email</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-envelope" />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="signup-password">Password</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-lock" />
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus" />
                    <span>Sign up</span>
                  </>
                )}
              </button>
              <div className="neo-auth-subfooter">
                <p className="neo-auth-switch" style={{ marginTop: 0 }}>
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
                <nav className="neo-auth-foot-nav" aria-label="Other pages">
                  <Link to="/staff-portal">Clinic portal</Link>
                  <span className="neo-auth-foot-dot" aria-hidden>
                    ·
                  </span>
                  <Link to="/">Home</Link>
                </nav>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => void handleSaaSSignup(e)} className="neo-auth-form">
              <div className="neo-form-group">
                <label htmlFor="signup-saas-name">Display name</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-user" />
                  <input
                    id="signup-saas-name"
                    type="text"
                    value={saasName}
                    onChange={(e) => setSaasName(e.target.value)}
                    placeholder="Your name or practice"
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="signup-saas-email">Email</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-envelope" />
                  <input
                    id="signup-saas-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="signup-saas-password">Password</label>
                <div className="neo-input-wrapper">
                  <i className="fa-solid fa-lock" />
                  <input
                    id="signup-saas-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus" />
                    <span>Create account</span>
                  </>
                )}
              </button>
              <div className="neo-auth-subfooter">
                <p className="neo-auth-switch" style={{ marginTop: 0 }}>
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
                <nav className="neo-auth-foot-nav" aria-label="Other pages">
                  <Link to="/staff-portal">Clinic portal</Link>
                  <span className="neo-auth-foot-dot" aria-hidden>
                    ·
                  </span>
                  <Link to="/">Home</Link>
                </nav>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
