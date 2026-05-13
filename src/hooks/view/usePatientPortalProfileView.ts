import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { PatientPortalMedicalSection, PatientPortalProfile } from '@/types/patientPortal';

export function usePatientPortalProfileView(enabled: boolean) {
  const [profile, setProfile] = useState<PatientPortalProfile | null>(null);
  const [sections, setSections] = useState<PatientPortalMedicalSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setLoading(true);
    try {
      const { profile: p } = await api.patientPortal.getProfile();
      setProfile(p);
      const med = await api.patientPortal.getMedicalSummary(p.id);
      setSections(med.sections);
    } catch (e) {
      setProfile(null);
      setSections([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async (patch: { name?: string; email?: string | null; address?: string | null }) => {
    setSaving(true);
    setError(null);
    try {
      const { profile: p } = await api.patientPortal.updateProfile(patch);
      setProfile(p);
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  };

  return { profile, sections, loading, error, saving, reload: load, saveProfile };
}
