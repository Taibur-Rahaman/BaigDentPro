import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminStats, type AdminStatsPayload } from '@/services/adminPanelService';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="dashboard-card tenant-card" style={{ minHeight: 120 }}>
      <div className="card-header">
        <h3>{label}</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--neo-text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

export const AdminOverviewPage: React.FC = () => {
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

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Admin overview</h1>
        <p className="tenant-page-lead">Scoped counts from <code>/api/admin/stats</code> (platform super admins see all tenants).</p>
      </div>
      {error ? <ApiError message={error} title="Could not load stats" onRetry={() => void load()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : stats ? (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <StatCard label="Users" value={stats.users} />
          <StatCard label="Clinics" value={stats.clinics} />
          <StatCard label="SaaS orders" value={stats.saasOrders} />
          <StatCard label="Catalog products" value={stats.saasProducts} />
          <StatCard label="Subscriptions" value={stats.subscriptions} />
          <StatCard label="Audit entries (7d)" value={stats.auditLogs7d} />
        </div>
      ) : null}
    </div>
  );
};
