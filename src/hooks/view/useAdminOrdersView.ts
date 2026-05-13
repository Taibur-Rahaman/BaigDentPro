import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminOrders } from '@/services/adminPanelService';
import type { AdminOrderRow } from '@/types/adminPanel';

export function useAdminOrdersView(page = 1, limit = 100) {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminOrders({ page, limit });
      setRows(res.orders);
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
