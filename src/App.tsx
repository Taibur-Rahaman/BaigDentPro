import React, { useState, useEffect } from 'react';
import { DashboardPage } from './DashboardPage';
import { HomePage } from './HomePage';
import api from './api';

export type View = 'home' | 'login' | 'dashboard';

type UserState = { name: string; role?: string; clinicId?: string | null } | null;

export const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<UserState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
    clinicName: '',
    phone: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('baigdentpro:token');
    const savedUser = localStorage.getItem('baigdentpro:user');
    if (token && savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser({ name: u.name || '', role: u.role, clinicId: u.clinicId });
      } catch {}
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const form = e.currentTarget;
    const email = (form.querySelector('input[name="email"]') as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector('input[name="password"]') as HTMLInputElement)?.value;

    try {
      const result = await api.auth.login(email, password);
      localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
      setUser({ name: result.user.name, role: result.user.role, clinicId: result.user.clinicId });
      setView('dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
      localStorage.setItem('baigdentpro:user', JSON.stringify(result.user));
      setUser({ name: result.user.name, role: result.user.role, clinicId: result.user.clinicId });
      setView('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    localStorage.removeItem('baigdentpro:user');
    setUser(null);
    setView('home');
  };

  if (view === 'home') {
    return <HomePage onLoginClick={() => setView('login')} />;
  }

  if (view === 'dashboard') {
    return <DashboardPage onLogout={handleLogout} userName={user?.name} userRole={user?.role} />;
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
              <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
              <p>{isRegister ? 'Register to get started' : 'Sign in to your command center'}</p>
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

            {isRegister ? (
              <form onSubmit={handleRegister} className="neo-auth-form">
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
                  <button type="button" onClick={() => setIsRegister(false)}>Sign In</button>
                </p>
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
                  <label>Password</label>
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
                  <button type="button" onClick={() => setIsRegister(true)}>Create Account</button>
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
