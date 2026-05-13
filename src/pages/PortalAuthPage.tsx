import React from 'react';
import { Link } from 'react-router-dom';
import { usePortalAuthView } from '@/hooks/view/usePortalAuthView';
import { isSupabaseAuthConfigured } from '@/lib/supabaseClient';
import { useSiteLogo } from '@/hooks/useSiteLogo';

/** Legacy clinic registration, Prisma login, password reset (Supabase email link). */
export const PortalAuthPage: React.FC = () => {
  const siteLogo = useSiteLogo();
  const {
    navigate,
    isLoading,
    error,
    setError,
    registerInfo,
    setRegisterInfo,
    isRegister,
    setIsRegister,
    registerData,
    setRegisterData,
    forgotPasswordMode,
    setForgotPasswordMode,
    recoveryMode,
    setRecoveryMode,
    forgotEmail,
    setForgotEmail,
    forgotSentMessage,
    setForgotSentMessage,
    recoveryPassword,
    setRecoveryPassword,
    recoveryPasswordConfirm,
    setRecoveryPasswordConfirm,
    handleLogin,
    handleForgotPassword,
    handleRecoveryPassword,
    handleRegister,
  } = usePortalAuthView();

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
            <div className="neo-logo neo-logo-lg" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <img src={siteLogo} alt="BaigDentPro" className="neo-logo-img neo-logo-img-lg" />
            </div>

            <h1 className="neo-auth-title">
              <span className="neo-gradient-text">Next-Gen</span> Dental
              <br />
              Practice Management
            </h1>

            <p className="neo-auth-subtitle">
              One powerful dashboard for everything. Prescriptions, patient records, appointments, billing, and lab orders — all in one place.
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

            <button type="button" className="neo-btn neo-btn-secondary" onClick={() => navigate('/')}>
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
                {isRegister ? 'Create Account' : recoveryMode ? 'Set new password' : forgotPasswordMode ? 'Reset password' : 'Welcome Back'}
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
              <form onSubmit={(e) => void handleRegister(e)} className="neo-auth-form">
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
                    <label>Professional title</label>
                    <div className="neo-input-wrapper">
                      <i className="fa-solid fa-user-doctor"></i>
                      <input
                        type="text"
                        value={registerData.title}
                        onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                        placeholder="Optional — Dr., Prof…"
                        maxLength={80}
                      />
                    </div>
                  </div>
                  <div className="neo-form-group">
                    <label>Degree / qualification</label>
                    <div className="neo-input-wrapper">
                      <i className="fa-solid fa-graduation-cap"></i>
                      <input
                        type="text"
                        value={registerData.degree}
                        onChange={(e) => setRegisterData({ ...registerData, degree: e.target.value })}
                        placeholder="Optional — BDS, DDS…"
                        maxLength={200}
                        list="register-degree-options"
                      />
                    </div>
                    <datalist id="register-degree-options">
                      {['BDS', 'DDS', 'FCPS', 'MS', 'MDS'].map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
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
              <form onSubmit={(e) => void handleForgotPassword(e)} className="neo-auth-form">
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
              <form onSubmit={(e) => void handleRecoveryPassword(e)} className="neo-auth-form">
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
              <form onSubmit={(e) => void handleLogin(e)} className="neo-auth-form">
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
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden></i>
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden></i>
                      <span>Sign in</span>
                    </>
                  )}
                </button>
                <p className="neo-auth-switch">
                  New here?{' '}
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
                    Register your clinic
                  </button>
                </p>
              </form>
            )}

            <div className="neo-auth-footer">
              <nav className="neo-auth-foot-nav" aria-label="Other sign-in options" style={{ marginBottom: 12 }}>
                <Link to="/login">Staff database login</Link>
                <span className="neo-auth-foot-dot" aria-hidden>
                  ·
                </span>
                <Link to="/">Home</Link>
              </nav>
              <p className="neo-auth-demo">Use the credentials your clinic administrator gave you.</p>
              <p className="neo-auth-copyright">© 2026 BaigDentPro • Omix Solutions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
