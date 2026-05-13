import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';

/**
 * Patient portal auth orchestration — session detection uses `api.patientPortal.getProfile()` probe
 * (no direct core storage imports from hooks).
 */
export function usePatientPortalAuthView() {
  const [clinicId, setClinicId] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    void (async () => {
      try {
        const { profile } = await api.patientPortal.getProfile();
        if (live) {
          setIsAuthed(true);
          setPatientName(profile.name);
        }
      } catch {
        if (live) setIsAuthed(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [hydrated]);

  const requestOtp = useCallback(async () => {
    setError(null);
    setDevHint(null);
    setBusy(true);
    try {
      const res = await api.patientPortal.requestOtp({ phone: phone.trim(), clinicId: clinicId.trim() });
      setStep('otp');
      if (typeof res.devCode === 'string') {
        setDevHint(`Dev code: ${res.devCode} (only when server returns devCode)`);
      }
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }, [clinicId, phone]);

  const verifyOtp = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.patientPortal.verifyOtp({
        phone: phone.trim(),
        clinicId: clinicId.trim(),
        code: code.trim(),
      });
      setPatientName(res.patient.name);
      setIsAuthed(true);
      setStep('form');
      setCode('');
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }, [clinicId, phone, code]);

  const logout = useCallback(() => {
    api.patientPortal.logout();
    setPatientName(null);
    setIsAuthed(false);
    setStep('form');
  }, []);

  return {
    hydrated,
    isAuthed,
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
    patientName,
    requestOtp,
    verifyOtp,
    logout,
  };
}
