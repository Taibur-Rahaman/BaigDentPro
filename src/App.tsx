import React, { useState } from 'react';
import { PrescriptionPage } from './PrescriptionPage';
import { RecordsPage } from './RecordsPage';

export type View = 'login' | 'prescription' | 'records';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('login');
  const [userName, setUserName] = useState('');
  const [loginMode, setLoginMode] = useState<'prescription' | 'records'>('prescription');

  if (view === 'prescription') {
    return <PrescriptionPage onBackToLogin={() => setView('login')} userName={userName || undefined} />;
  }
  if (view === 'records') {
    return <RecordsPage onBackToLogin={() => setView('login')} userName={userName || undefined} />;
  }

  return (
    <div className="app-shell">
      <main className="auth-shell">
        <section className="hero-panel">
          <div className="hero-logo">
            <i className="fa-solid fa-tooth"></i>
            BaigMed
          </div>
          <h1 className="hero-title">Professional Dental & Medical Management System</h1>
          <p className="hero-subtitle">
            Streamline your clinic with world-class dental practice management. 
            Comprehensive solutions for modern healthcare professionals.
          </p>
          <div className="hero-features">
            <div className="hero-feature">
              <i className="fa-solid fa-prescription-bottle-medical"></i>
              <span>Digital Prescriptions with Drug Database</span>
            </div>
            <div className="hero-feature">
              <i className="fa-solid fa-users"></i>
              <span>Complete Patient Records Management</span>
            </div>
            <div className="hero-feature">
              <i className="fa-solid fa-calendar-check"></i>
              <span>Smart Appointment Scheduling</span>
            </div>
            <div className="hero-feature">
              <i className="fa-solid fa-file-invoice-dollar"></i>
              <span>Billing & Payment Tracking</span>
            </div>
            <div className="hero-feature">
              <i className="fa-solid fa-comment-sms"></i>
              <span>SMS & WhatsApp Notifications</span>
            </div>
            <div className="hero-feature">
              <i className="fa-solid fa-chart-line"></i>
              <span>Analytics & Reports Dashboard</span>
            </div>
          </div>
        </section>
        <section className="form-panel">
          <div className="card login-card">
            <div className="card-header">
              <div className="card-title">Welcome to BaigMed</div>
              <div className="card-subtitle">Sign in to access your professional dashboard</div>
            </div>
            <div className="login-options">
              <button
                type="button"
                className={`login-option ${loginMode === 'prescription' ? 'active' : ''}`}
                onClick={() => setLoginMode('prescription')}
              >
                <span className="login-option-icon">💊</span>
                <span className="login-option-label">Prescription Panel</span>
                <span className="login-option-desc">OPD prescriptions, drugs & printing</span>
              </button>
              <button
                type="button"
                className={`login-option ${loginMode === 'records' ? 'active' : ''}`}
                onClick={() => setLoginMode('records')}
              >
                <span className="login-option-icon">📋</span>
                <span className="login-option-label">Records Panel</span>
                <span className="login-option-desc">Patients, appointments & billing</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const un = (form.querySelector('input[name="username"]') as HTMLInputElement)?.value?.trim() || '';
                setUserName(un);
                setView(loginMode);
              }}
            >
              <div className="form-group">
                <label className="label">Username / Doctor Name</label>
                <input className="input" name="username" placeholder="Enter your name" required />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Enter password" required />
              </div>
              <div className="actions-row">
                <button type="submit" className="btn-primary">
                  <i className="fa-solid fa-sign-in-alt"></i> Sign In to {loginMode === 'prescription' ? 'Prescription' : 'Records'} Panel
                </button>
              </div>
            </form>
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <p>Demo Mode: Enter any credentials to access</p>
              <p style={{ marginTop: '8px' }}>© 2024 BaigMed • Omix Solutions</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

