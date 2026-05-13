import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { orderService, type SaasOrder } from '@/services/orderService';

export function useOrders() {
  const [rows, setRows] = useState<SaasOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setRows(await orderService.list());
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload, clearError: () => setError(null) };
}

export function useCreateOrder() {
  const [pending, setPending] = useState(false);

  const create = useCallback(
    async (productId: string, quantity: number): Promise<{ ok: true } | { ok: false; error: string }> => {
      setPending(true);
      try {
        await orderService.create(productId, quantity);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: userMessageFromUnknown(e) };
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { create, pending };
}

export function useDeleteOrder() {
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const remove = useCallback(async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    setPending(true);
    setActiveId(id);
    try {
      await orderService.remove(id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: userMessageFromUnknown(e) };
    } finally {
      setPending(false);
      setActiveId(null);
    }
  }, []);

  return { remove, pending, activeId };
}
