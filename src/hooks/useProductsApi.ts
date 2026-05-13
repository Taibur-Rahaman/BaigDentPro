import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { productService, type SaasProduct } from '@/services/productService';

export function useProducts() {
  const [rows, setRows] = useState<SaasProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setRows(await productService.list());
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

export function useCreateProduct() {
  const [pending, setPending] = useState(false);

  const create = useCallback(
    async (
      name: string,
      price: number,
      costPrice = 0,
      imageUrl?: string | null
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      setPending(true);
      try {
        await productService.create(name, price, costPrice, imageUrl);
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

export function useUpdateProduct() {
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const update = useCallback(
    async (
      id: string,
      name: string,
      price: number
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      setPending(true);
      setActiveId(id);
      try {
        await productService.update(id, name, price);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: userMessageFromUnknown(e) };
      } finally {
        setPending(false);
        setActiveId(null);
      }
    },
    []
  );

  return { update, pending, activeId };
}

export function useDeleteProduct() {
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const remove = useCallback(async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    setPending(true);
    setActiveId(id);
    try {
      await productService.remove(id);
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
