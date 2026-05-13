import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { ClinicActivityLogRow } from '@/types/clinicWorkspace';

export function useClinicActivityLogsView(filters: { userId: string; from: string; to: string }) {
  const { userId, from, to } = filters;
  const [rows, setRows] = useState<ClinicActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.activityLogs({
        page: 1,
        limit: 100,
        userId: userId.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
      });
      setRows(res.logs);
      setTotal(res.total ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [userId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, total, loading, error, reload: load, clearError: () => setError(null) };
}
