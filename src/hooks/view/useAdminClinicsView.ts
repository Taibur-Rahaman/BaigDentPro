import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { disableAdminClinic, fetchAdminClinics, type AdminClinicRow } from '@/services/adminPanelService';

/** Super-admin clinics table: list + suspend/enable. */
export function useAdminClinicsView() {
  const [rows, setRows] = useState<AdminClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminClinicRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminClinics();
      setRows(res.clinics);
    } catch (e) {
      setRows([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleClinicActive = useCallback(
    async (c: AdminClinicRow) => {
      const nextDisabled = Boolean(c.isActive);
      const label = nextDisabled ? 'suspend' : 'restore';
      if (!window.confirm(`${nextDisabled ? 'Suspend' : 'Re-enable'} clinic "${c.name}"? Staff may lose access.`)) return;
      setBusyId(c.id);
      try {
        await disableAdminClinic({ clinicId: c.id, disabled: nextDisabled });
        await load();
      } catch (e) {
        setError(userMessageFromUnknown(e) || `Could not ${label} clinic`);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return {
    rows,
    loading,
    error,
    detail,
    setDetail,
    busyId,
    load,
    toggleClinicActive,
  };
}
