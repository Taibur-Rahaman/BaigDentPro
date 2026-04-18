import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { orderService, type SaasOrder } from '@/services/orderService';

function isSaasOrderRow(d: unknown): d is SaasOrder {
  if (!d || typeof d !== 'object') return false;
  const r = d as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.clinicId === 'string' &&
    typeof r.total === 'number' &&
    Array.isArray(r.items) &&
    r.items.every(
      (it) =>
        it &&
        typeof it === 'object' &&
        typeof (it as Record<string, unknown>).productId === 'string' &&
        typeof (it as Record<string, unknown>).quantity === 'number'
    )
  );
}

export function isOrderListPayload(v: unknown): v is { success: boolean; data: SaasOrder[] } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.success !== true || !Array.isArray(o.data)) return false;
  return (o.data as unknown[]).every((row) => isSaasOrderRow(row));
}

export function isOrderRowPayload(v: unknown): v is { success: boolean; data: SaasOrder } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const d = o.data;
  return o.success === true && isSaasOrderRow(d);
}

export function useOrders() {
  const [rows, setRows] = useState<SaasOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await orderService.list();
      if (!isOrderListPayload(res)) {
        throw new Error('Unexpected response from server.');
      }
      setRows(res.data);
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
    async (
      productId: string,
      quantity: number
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      setPending(true);
      try {
        const res = await orderService.create(productId, quantity);
        if (!isOrderRowPayload(res)) {
          return { ok: false, error: 'Unexpected response from server.' };
        }
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
