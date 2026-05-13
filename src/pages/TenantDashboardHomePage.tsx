import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/components/ApiError';
import { FeatureGate } from '@/components/FeatureGate';
import { useCurrentUser } from '@/hooks/useCurrentUserApi';
import { useOrders } from '@/hooks/useOrdersApi';
import { useProducts } from '@/hooks/useProductsApi';
import { canAccessCommerceOnlyAccount } from '@/lib/routeAccess';

const formatMoney = (n: number) =>
  `৳${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const TenantDashboardHomePage: React.FC = () => {
  const me = useCurrentUser();
  const products = useProducts();
  const orders = useOrders();

  const loading = me.loading || products.loading || orders.loading;
  const error = me.error || products.error || orders.error;

  const totalProfit = useMemo(
    () => orders.rows.reduce((sum, o) => sum + (Number(o.profit?.amount) || 0), 0),
    [orders.rows]
  );

  const reload = () => {
    me.clearError();
    products.clearError();
    orders.clearError();
    void me.reload();
    void products.reload();
    void orders.reload();
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Shop dashboard</h1>
        <p className="tenant-page-lead">Catalog overview, SaaS tenant orders, and product profit estimates.</p>
        {me.user ? (
          <p className="tenant-page-lead" style={{ marginTop: 8, opacity: 0.85 }}>
            Signed in as <strong>{me.user.name}</strong> <span style={{ color: 'var(--neo-text-muted, #64748b)' }}>({me.user.email})</span>
            {me.user.role ? (
              <span style={{ marginLeft: 8, color: 'var(--neo-text-muted, #64748b)', fontSize: '0.9rem' }}>· {me.user.role}</span>
            ) : null}
          </p>
        ) : null}
      </div>

      {error ? (
        <ApiError
          message={error}
          title="Could not load dashboard"
          onRetry={() => void reload()}
        />
      ) : null}

      {loading ? (
        <div className="tenant-loading" role="status" aria-live="polite">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <>
          <div className="tenant-stats-grid">
            <div className="tenant-stat-card">
              <span className="tenant-stat-label">Total products</span>
              <span className="tenant-stat-value">{products.rows.length}</span>
              <Link to="/dashboard/products" className="tenant-stat-link">
                Manage products →
              </Link>
            </div>
            <div className="tenant-stat-card">
              <span className="tenant-stat-label">Total orders</span>
              <span className="tenant-stat-value">{orders.rows.length}</span>
              <Link to="/dashboard/orders" className="tenant-stat-link">
                View orders →
              </Link>
            </div>
            <div className="tenant-stat-card tenant-stat-card-accent">
              <span className="tenant-stat-label">Total profit</span>
              <span className="tenant-stat-value">{formatMoney(totalProfit)}</span>
              <span className="tenant-stat-hint">Sum of order totals (SaaS orders)</span>
            </div>
          </div>

          <FeatureGate feature="analytics.view">
            <p className="tenant-page-lead" style={{ marginTop: '1rem' }}>
              Analytics and exports are enabled for your plan.
            </p>
          </FeatureGate>

          {me.user && !canAccessCommerceOnlyAccount(me.user.role) ? (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <Link
                to="/dashboard/appointments"
                className="neo-btn neo-btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <i className="fa-solid fa-stethoscope" aria-hidden /> Go to clinical dashboard
              </Link>
              <span className="tenant-page-lead" style={{ margin: 0 }}>
                Patients, appointments, prescriptions &amp; billing
              </span>
            </div>
          ) : (
            <p className="tenant-practice-hint">
              Need clinical tools? Ask your administrator for workspace access — this page stays focused on the shop catalog.
            </p>
          )}
        </>
      )}
    </div>
  );
};
