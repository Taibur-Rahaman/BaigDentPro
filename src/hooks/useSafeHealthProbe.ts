import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/api';

const DEFAULT_DEBOUNCE_MS = 175;

export type UseSafeHealthProbeOptions = {
  enabled: boolean;
  /** @deprecated No longer used for scheduling — probes run on `enabled` / `refetch` only to avoid /api/health spam on every route change. */
  pathname?: string;
  debounceMs?: number;
  /**
   * When true, waits until after the first client `requestAnimationFrame` before `enabled`
   * is respected for probing (SSR / hydration-safe). Parent can omit local `hydrated` state.
   */
  deferUntilPaint?: boolean;
};

export type UseSafeHealthProbeReturn = {
  failed: boolean;
  isLoading: boolean;
  refetch: () => void;
};

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  return e instanceof Error && e.name === 'AbortError';
}

/**
 * Debounced `/api/health` probe with AbortController + monotonic identities so only the latest
 * scheduling cycle / request updates `failed` / `isLoading`.
 */
export function useSafeHealthProbe(options: UseSafeHealthProbeOptions): UseSafeHealthProbeReturn {
  const {
    enabled,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    deferUntilPaint = false,
  } = options;

  const [paintReady, setPaintReady] = useState(() => !deferUntilPaint);
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchNonce, setRefetchNonce] = useState(0);

  const probeAbortRef = useRef<AbortController | null>(null);
  const scheduleEpochRef = useRef(0);
  const probeIdRef = useRef(0);

  const abortActiveProbe = useCallback(() => {
    probeAbortRef.current?.abort();
    probeAbortRef.current = null;
  }, []);

  useEffect(() => {
    if (!deferUntilPaint) {
      return undefined;
    }
    const id = requestAnimationFrame(() => setPaintReady(true));
    return () => cancelAnimationFrame(id);
  }, [deferUntilPaint]);

  const probeEnabled = enabled && paintReady;

  useEffect(() => {
    scheduleEpochRef.current += 1;
    const scheduleEpoch = scheduleEpochRef.current;

    abortActiveProbe();

    if (!probeEnabled) {
      setFailed(false);
      setIsLoading(false);
      return () => {
        abortActiveProbe();
      };
    }

    setFailed(false);
    setIsLoading(false);

    const debounceTimer = window.setTimeout(() => {
      if (scheduleEpoch !== scheduleEpochRef.current) return;

      abortActiveProbe();

      probeIdRef.current += 1;
      const probeId = probeIdRef.current;

      const controller = new AbortController();
      probeAbortRef.current = controller;

      setIsLoading(true);

      void (async () => {
        try {
          await api.health.ping(controller.signal);
          if (probeId !== probeIdRef.current) return;
          if (scheduleEpoch !== scheduleEpochRef.current) return;
          setFailed(false);
        } catch (e) {
          if (probeId !== probeIdRef.current) return;
          if (scheduleEpoch !== scheduleEpochRef.current) return;
          if (controller.signal.aborted) return;
          if (isAbortError(e)) return;
          setFailed(true);
        } finally {
          if (probeId === probeIdRef.current && scheduleEpoch === scheduleEpochRef.current) {
            setIsLoading(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      window.clearTimeout(debounceTimer);
      abortActiveProbe();
      setIsLoading(false);
    };
    /** Intentionally omit `pathname`: re-probing on every client navigation caused redundant /api/health traffic and main-thread work. */
  }, [abortActiveProbe, debounceMs, probeEnabled, refetchNonce]);

  const refetch = useCallback(() => {
    setRefetchNonce((n) => n + 1);
  }, []);

  return {
    failed,
    isLoading,
    refetch,
  };
}
