import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminAuditLogs } from '@/services/adminPanelService';
import type { AdminAuditLogRow } from '@/types/adminPanel';

export function useAdminAuditLogsView(page = 1, limit = 80) {
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminAuditLogs({ page, limit });
      setRows(res.logs);
      setTotal(res.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, total, loading, error, reload: load, clearError: () => setError(null) };
}
