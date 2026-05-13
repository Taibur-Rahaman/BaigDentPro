import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';

export type BranchRow = { id: string; clinicId: string; name: string; address?: string | null };

export function useBranchesDashboardView() {
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.branches();
      setRows(res.branches || []);
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

  const createBranch = useCallback(async (name: string, address: string) => {
    setSaving(true);
    setError(null);
    try {
      await api.clinic.createBranch({ name: name.trim(), address: address.trim() || null });
      await load();
      return true;
    } catch (err) {
      setError(userMessageFromUnknown(err));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const removeBranch = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.clinic.deleteBranch(id);
        await load();
        return true;
      } catch (err) {
        setError(userMessageFromUnknown(err));
        return false;
      }
    },
    [load]
  );

  return { rows, loading, error, saving, reload: load, createBranch, removeBranch, clearError: () => setError(null) };
}
