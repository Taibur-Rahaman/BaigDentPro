import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminStats } from '@/services/adminPanelService';
import type { AdminStatsPayload } from '@/types/adminPanel';

export function useAdminOverviewView() {
  const [stats, setStats] = useState<AdminStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e) {
      setStats(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, loading, error, reload: load, clearError: () => setError(null) };
}
