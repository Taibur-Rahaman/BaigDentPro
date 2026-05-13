import React, { useCallback, useEffect, useRef, useState } from 'react';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';

const POLL_MS = 15_000;

export const AdminSystemMonitoringPage: React.FC = () => {
  const [payload, setPayload] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const cancelled = useRef(false);

  const load = useCallback(async (isPoll: boolean) => {
    if (isPoll) setRefreshing(true);
    else setInitialLoad(true);
    setError(null);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    try {
      const data = await coreApiRequest<unknown>('/health', { method: 'GET', omitAuth: true });
      if (cancelled.current) return;
      setPayload(data);
      setFetchedAt(new Date().toISOString());
      if (t0) setLatencyMs(Math.round(performance.now() - t0));
    } catch (e) {
      if (!cancelled.current) {
        setError(userMessageFromUnknown(e));
        setPayload(null);
        setLatencyMs(null);
      }
    } finally {
      if (!cancelled.current) {
        setInitialLoad(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    void load(false);
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => {
      cancelled.current = true;
      window.clearInterval(id);
    };
  }, [load]);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Operations monitoring</h1>
        <p className="tenant-page-lead">
          Live <code>GET /api/health</code> with {POLL_MS / 1000}s polling (latency measured client-side). Sessions, queues, and DB internals
          still require your host APM + Postgres dashboards — wire them beside this JSON probe.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', color: 'var(--neo-text-muted)', fontSize: 13 }}>
          {fetchedAt ? <span>Last OK: {fetchedAt}</span> : null}
          {latencyMs !== null ? (
            <span>
              RTT: <strong>{latencyMs}ms</strong>
            </span>
          ) : null}
          {refreshing ? <span aria-live="polite">Refreshing…</span> : null}
        </div>
      </div>
      {error ? <ApiError message={error} title="Health check failed" onRetry={() => void load(false)} /> : null}
      {initialLoad && !error ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Probing API…</span>
        </div>
      ) : (
        <pre
          className="tenant-card"
          style={{
            padding: 16,
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.45,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
};
