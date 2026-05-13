import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { ClinicProfile } from '@/types/clinicWorkspace';

const LOGO_MAX_BYTES = 65_000;

export function useClinicProfileEditorView() {
  const [profile, setProfileState] = useState<ClinicProfile | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [logoHint, setLogoHint] = useState<string | null>(null);

  const applyProfile = useCallback((p: ClinicProfile) => {
    setProfileState(p);
    setName(p.name);
    setAddress(p.address ?? '');
    setPhone(p.phone ?? '');
    setEmail(p.email ?? '');
    setTimezone(p.timezone ?? '');
    setLogo(p.logo);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { profile: p } = await api.clinic.getProfile();
      applyProfile(p);
    } catch (e) {
      setProfileState(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLogoFile = (file: File | null) => {
    setLogoHint(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl.length > LOGO_MAX_BYTES) {
        setLogoHint(`Image is too large after encoding (max ~${LOGO_MAX_BYTES} characters). Try a smaller file.`);
        return;
      }
      setLogo(dataUrl);
    };
    reader.onerror = () => setLogoHint('Could not read file.');
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveMsg(null);
    setSaving(true);
    try {
      const { profile: p } = await api.clinic.updateProfile({
        name: name.trim(),
        address: address.trim() === '' ? null : address.trim(),
        phone: phone.trim() === '' ? null : phone.trim(),
        email: email.trim() === '' ? null : email.trim(),
        timezone: timezone.trim() === '' ? null : timezone.trim(),
        logo: logo === '' ? null : logo,
      });
      applyProfile(p);
      setSaveMsg('Clinic profile saved.');
      return true;
    } catch (err) {
      setError(userMessageFromUnknown(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const clearLogo = () => {
    setLogo(null);
    setLogoHint(null);
  };

  return {
    profile,
    name,
    setName,
    address,
    setAddress,
    phone,
    setPhone,
    email,
    setEmail,
    timezone,
    setTimezone,
    logo,
    loading,
    saving,
    error,
    saveMsg,
    logoHint,
    reload: load,
    onLogoFile,
    saveProfile,
    clearLogo,
    clearError: () => setError(null),
  };
}
