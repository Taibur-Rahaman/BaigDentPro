import React, { useState, useEffect } from 'react';
import { DashboardPage } from './DashboardPage';
import { HomePage } from './HomePage';
import api from './api';
import { getSupabase, isSupabaseAuthConfigured } from './supabaseClient';

export type View = 'home' | 'login' | 'dashboard';

type UserState = { id?: string; name: string; role?: string; clinicId?: string | null } | null;

export const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<UserState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerInfo, setRegisterInfo] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
    clinicName: '',
    phone: '',
  });
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSentMessage, setForgotSentMessage] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRegister(false);
        setForgotPasswordMode(false);
        setForgotSentMessage('');
        setRecoveryMode(true);
        setView('login');
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('baigdentpro:token');
    const savedUser = localStorage.getItem('baigdentpro:user');
    if (!token) return;

    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser({ id: u.id, name: u.name || '', role: u.role, clinicId: u.clinicId });
        setView('dashboard');
      } catch {
        localStorage.removeItem('baigdentpro:user');
      }
      return;
    }

    api.auth
      .me()
      .then((u) => {
        localStorage.setItem('baigdentpro:user', JSON.stringify(u));
        setUser({ id: u.id, name: u.name || '', role: u.role, clinicId: u.clinicId });
        setView('dashboard');
      })
      .catch(() => {
        api.auth.logout();
      });
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setRegisterInfo('');
    setIsLoading(true);

    const form = e.currentTarget;
    const email = (form.querySelector('input[name="email"]') as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector('input[name="password"]') as HTMLInputElement)?.value;

    try {
      const sb = getSupabase();
      if (sb && email && password) {
        const { data: sbData, error: sbError } = await sb.auth.signInWithPassword({ email, password });
        if (!sbError && sbData.session?.access_token) {
          try {
            const result = await api.auth.exchangeSupabaseSession(sbData.session.access_token);
            await sb.auth.signOut();
            localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
            setUser({
              id: result.user.id,
              name: result.user.name,
              role: result.user.role,
              clinicId: result.user.clinicId,
            });
            setView('dashboard');
            return;
          } catch (exchangeErr: any) {
            await sb.auth.signOut();
            setError(exchangeErr.message || 'Could not complete sign-in for this account');
            return;
          }
        }
      }

      const result = await api.auth.login(email, password);
      localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
      setUser({
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        clinicId: result.user.clinicId,
      });
      setView('dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setForgotSentMessage('');
    const sb = getSupabase();
    if (!sb) {
      setError('Password reset requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname || '/'}`;
      const { error: sbErr } = await sb.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo });
      if (sbErr) throw new Error(sbErr.message);
      setForgotSentMessage('If an account exists for that email, you will receive a reset link shortly.');
    } catch (err: any) {
      setError(err.message || 'Could not send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (recoveryPassword !== recoveryPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setError('Session lost. Open the reset link from your email again.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: upErr } = await sb.auth.updateUser({ password: recoveryPassword });
      if (upErr) throw new Error(upErr.message);
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Open the reset link again.');
      await api.auth.syncPrismaPassword(session.access_token, recoveryPassword);
      const result = await api.auth.exchangeSupabaseSession(session.access_token);
      await sb.auth.signOut();
      localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
      setUser({
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        clinicId: result.user.clinicId,
      });
      setRecoveryMode(false);
      setRecoveryPassword('');
      setRecoveryPasswordConfirm('');
      setView('dashboard');
    } catch (err: any) {
      setError(err.message || 'Could not update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await api.auth.register(registerData);
      if (result.pendingApproval || !result.token) {
        setRegisterInfo(
          result.message ||
            'Your account was created and is pending approval by a platform administrator. You cannot sign in until it is approved.'
        );
        setError('');
        setIsRegister(false);
        setRegisterData({
          email: '',
          password: '',
          name: '',
          clinicName: '',
          phone: '',
        });
        return;
      }
      localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
      setUser({
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        clinicId: result.user.clinicId,
      });
      setRegisterInfo('');
      setView('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    void getSupabase()?.auth.signOut();
    api.auth.logout();
    localStorage.removeItem('baigdentpro:user');
    setUser(null);
    setView('home');
  };

  if (view === 'home') {
    return <HomePage onLoginClick={() => setView('login')} />;
  }

  if (view === 'dashboard') {
    return (
      <DashboardPage
        onLogout={handleLogout}
        userName={user?.name}
        userRole={user?.role}
        userClinicId={user?.clinicId ?? undefined}
        currentUserId={user?.id}
      />
    );
  }

  return (
    <div className="neo-auth">
      {/* Animated Background */}
      <div className="neo-bg-grid"></div>
      <div className="neo-bg-glow neo-bg-glow-1"></div>
      <div className="neo-bg-glow neo-bg-glow-2"></div>
      
      <div className="neo-auth-container">
        {/* Left Panel - Branding */}
        <div className="neo-auth-brand">
          <div className="neo-auth-brand-content">
            <div className="neo-logo neo-logo-lg" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
              <img src="/logo.png" alt="BaigDentPro" className="neo-logo-img neo-logo-img-lg" />
            </div>
            
            <h1 className="neo-auth-title">
              <span className="neo-gradient-text">Next-Gen</span> Dental
              <br />Practice Management
            </h1>
            
            <p className="neo-auth-subtitle">
              One powerful dashboard for everything. Prescriptions, patient records, 
              appointments, billing, and lab orders — all in one place.
            </p>

            <div className="neo-auth-features">
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-solid fa-prescription"></i>
                </div>
                <span>Digital Prescriptions with Drug Database</span>
              </div>
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-solid fa-user-group"></i>
                </div>
                <span>Complete Patient Records & Dental Charts</span>
              </div>
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <span>Smart Appointment Scheduling with SMS</span>
              </div>
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <span>Billing, Invoices & Payment Tracking</span>
              </div>
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-solid fa-flask-vial"></i>
                </div>
                <span>Lab Order Tracking (Crown, Bridge, Denture)</span>
              </div>
              <div className="neo-auth-feature">
                <div className="neo-auth-feature-icon">
                  <i className="fa-brands fa-whatsapp"></i>
                </div>
                <span>WhatsApp & Email Integration</span>
              </div>
            </div>

            <button className="neo-btn neo-btn-secondary" onClick={() => setView('home')}>
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="neo-auth-form-panel">
          <div className="neo-auth-card">
            <div className="neo-auth-card-header">
              <h2>
                {isRegister
                  ? 'Create Account'
                  : recoveryMode
                    ? 'Set new password'
                    : forgotPasswordMode
                      ? 'Reset password'
                      : 'Welcome Back'}
              </h2>
              <p>
                {isRegister
                  ? 'Register to get started'
                  : recoveryMode
                    ? 'Choose a strong password, then you will be signed in'
                    : forgotPasswordMode
                      ? 'We will email you a secure link if Supabase Auth is enabled'
                      : 'Sign in to your command center'}
              </p>
            </div>

            {!isRegister && (
              <div className="neo-auth-info-box">
                <div className="neo-auth-info-icon">
                  <i className="fa-solid fa-grid-2"></i>
                </div>
                <div className="neo-auth-info-content">
                  <h4>Unified Dashboard</h4>
                  <p>Access all features in one place: Prescriptions, Patients, Appointments, Billing, Lab Orders & more</p>
                </div>
              </div>
            )}

            {error && (
              <div className="neo-auth-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            {!isRegister && registerInfo && (
              <div className="neo-auth-info-box" style={{ borderColor: 'rgba(13, 148, 136, 0.35)', background: 'rgba(236, 253, 245, 0.5)' }}>
                <div className="neo-auth-info-icon">
                  <i className="fa-solid fa-hourglass-half"></i>
                </div>
                <div className="neo-auth-info-content">
                  <h4>Pending approval</h4>
                  <p>{registerInfo}</p>
                </div>
              </div>
            )}

            {isRegister ? (
              <form onSubmit={handleRegister} className="neo-auth-form">
                <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                  After you submit this form, a platform super admin must approve your clinic before you can sign in.
                </p>
                <div className="neo-form-group">
                  <label>Full Name</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-user"></i>
                    <input
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      placeholder="Dr. John Doe"
                      required
                    />
                  </div>
                </div>
                <div className="neo-form-group">
                  <label>Email</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="doctor@clinic.com"
                      required
                    />
                  </div>
                </div>
                <div className="neo-form-group">
                  <label>Password</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Create a password"
                      required
                    />
                  </div>
                </div>
                <div className="neo-form-row">
                  <div className="neo-form-group">
                    <label>Clinic Name</label>
                    <div className="neo-input-wrapper">
                      <i className="fa-solid fa-hospital"></i>
                      <input
                        type="text"
                        value={registerData.clinicName}
                        onChange={(e) => setRegisterData({ ...registerData, clinicName: e.target.value })}
                        placeholder="Your Dental Clinic"
                      />
                    </div>
                  </div>
                  <div className="neo-form-group">
                    <label>Phone</label>
                    <div className="neo-input-wrapper">
                      <i className="fa-solid fa-phone"></i>
                      <input
                        type="tel"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        placeholder="+880 1XXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-user-plus"></i>
                      <span>Create Account</span>
                    </>
                  )}
                </button>
                <p className="neo-auth-switch">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setForgotPasswordMode(false);
                      setRecoveryMode(false);
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </form>
            ) : forgotPasswordMode && !recoveryMode ? (
              <form onSubmit={handleForgotPassword} className="neo-auth-form">
                <div className="neo-form-group">
                  <label>Email</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-envelope"></i>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="doctor@clinic.com"
                      required
                    />
                  </div>
                </div>
                {forgotSentMessage && (
                  <div
                    className="neo-auth-info-box"
                    style={{ borderColor: 'rgba(13, 148, 136, 0.35)', background: 'rgba(236, 253, 245, 0.5)' }}
                  >
                    <div className="neo-auth-info-icon">
                      <i className="fa-solid fa-envelope-circle-check"></i>
                    </div>
                    <div className="neo-auth-info-content">
                      <h4>Check your inbox</h4>
                      <p>{forgotSentMessage}</p>
                    </div>
                  </div>
                )}
                <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>Send reset link</span>
                    </>
                  )}
                </button>
                <p className="neo-auth-switch">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(false);
                      setForgotSentMessage('');
                      setError('');
                    }}
                  >
                    Back to Sign In
                  </button>
                </p>
              </form>
            ) : recoveryMode ? (
              <form onSubmit={handleRecoveryPassword} className="neo-auth-form">
                <div className="neo-form-group">
                  <label>New password</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type="password"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div className="neo-form-group">
                  <label>Confirm password</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type="password"
                      value={recoveryPasswordConfirm}
                      onChange={(e) => setRecoveryPasswordConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Save password &amp; sign in</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="neo-auth-form">
                <div className="neo-form-group">
                  <label>Email</label>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-envelope"></i>
                    <input name="email" type="email" placeholder="doctor@clinic.com" required />
                  </div>
                </div>
                <div className="neo-form-group">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <label style={{ marginBottom: 0 }}>Password</label>
                    {isSupabaseAuthConfigured() && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setForgotSentMessage('');
                          setError('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 13,
                          color: '#0d9488',
                          fontWeight: 500,
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="neo-input-wrapper">
                    <i className="fa-solid fa-lock"></i>
                    <input name="password" type="password" placeholder="Enter password" required />
                  </div>
                </div>
                <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-right-to-bracket"></i>
                      <span>Sign In to Dashboard</span>
                    </>
                  )}
                </button>
                <p className="neo-auth-switch">
                  New to BaigDentPro?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setRegisterInfo('');
                      setError('');
                      setForgotPasswordMode(false);
                      setRecoveryMode(false);
                    }}
                  >
                    Create Account
                  </button>
                </p>
              </form>
            )}

            <div className="neo-auth-footer">
              <p className="neo-auth-demo">Demo: demo@baigdentpro.com / password123</p>
              <p className="neo-auth-copyright">© 2026 BaigDentPro • Omix Solutions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
