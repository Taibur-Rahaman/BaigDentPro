import React from 'react';
import { usePatientPortalAuth } from '@/pages/portal/PatientPortalAuthContext';

export const PatientPortalLoginPage: React.FC = () => {
  const {
    clinicId,
    setClinicId,
    phone,
    setPhone,
    code,
    setCode,
    step,
    busy,
    error,
    devHint,
    requestOtp,
    verifyOtp,
  } = usePatientPortalAuth();

  return (
    <div className="patient-portal-root">
      <h1 className="pp-title">Patient sign-in</h1>
      <p className="pp-muted" style={{ marginBottom: '1rem' }}>
        OTP to the phone we have on file. You need your clinic ID (ask reception).
      </p>

      <div className="pp-card">
        <label className="pp-field">
          <span>Clinic ID</span>
          <input value={clinicId} onChange={(e) => setClinicId(e.target.value)} autoComplete="off" />
        </label>
        <label className="pp-field">
          <span>Mobile phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        {step === 'otp' ? (
          <label className="pp-field">
            <span>6-digit code</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} />
          </label>
        ) : null}
        {error ? (
          <p style={{ color: '#b91c1c', fontSize: '0.9rem', marginTop: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        {devHint ? (
          <p style={{ color: '#b45309', fontSize: '0.85rem' }} role="status">
            {devHint}
          </p>
        ) : null}
        {step === 'form' ? (
          <button type="button" className="pp-btn pp-btn-primary" disabled={busy} onClick={() => void requestOtp()}>
            {busy ? 'Sending code…' : 'Send code'}
          </button>
        ) : (
          <button type="button" className="pp-btn pp-btn-primary" disabled={busy} onClick={() => void verifyOtp()}>
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
        )}
      </div>
    </div>
  );
};
