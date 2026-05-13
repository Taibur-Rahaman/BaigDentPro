import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { ClinicProfile } from '@/types/clinicWorkspace';

/** Clinic profile slice for `/dashboard/settings` (timezone + reload). */
export function useDashboardSettingsWorkspaceView(enabled: boolean) {
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.getProfile();
      setProfile(res.profile);
    } catch (e) {
      setProfile(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTimezone = useCallback(async () => {
    if (!enabled || !profile) return false;
    setSaving(true);
    setError(null);
    try {
      const tz = (profile.timezone ?? '').trim();
      const res = await api.clinic.updateProfile({ timezone: tz || null });
      setProfile(res.profile);
      return true;
    } catch (e) {
      setError(userMessageFromUnknown(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [enabled, profile]);

  return {
    profile,
    setProfile,
    loading,
    saving,
    error,
    reload: load,
    saveTimezone,
    clearError: () => setError(null),
  };
}
