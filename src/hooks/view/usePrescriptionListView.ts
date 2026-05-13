import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import api from '@/api';
import { mapPrescriptionToViewModel, type PrescriptionViewModel } from '@/viewModels';

export interface PrescriptionListView {
  prescriptions: PrescriptionViewModel[];
  setPrescriptions: Dispatch<SetStateAction<PrescriptionViewModel[]>>;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Server-backed prescription list for UI surfaces (e.g. embedded prescription app “view all”).
 */
export function usePrescriptionListView(token: string | null | undefined, enabled: boolean): PrescriptionListView {
  const [prescriptions, setPrescriptions] = useState<PrescriptionViewModel[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !enabled) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.prescriptions.list({ page: 1, limit: 100 });
      setPrescriptions(res.prescriptions.map(mapPrescriptionToViewModel));
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [token, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { prescriptions, setPrescriptions, loading, refresh };
}
