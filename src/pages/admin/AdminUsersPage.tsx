import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ApiError } from '@/components/ApiError';
import { useAdminUsersDashboardView } from '@/hooks/view/useAdminUsersDashboardView';
import { useAuth } from '@/hooks/useAuth';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { fetchAdminClinics } from '@/services/adminPanelService';
import type { AdminClinicRow } from '@/types/adminPanel';
import { ADMIN_USER_DIRECTORY_SORT_KEYS, parseAdminUserDirectorySort } from '@/types/adminUsersDirectory';
import { AdminUserGridRow } from '@/features/admin/users/AdminUserGridRow';
import {
  ADMIN_USER_ROW_HEIGHT_STANDARD,
  ADMIN_USER_ROW_HEIGHT_SUPER,
} from '@/features/admin/users/adminUserGridMetrics';
import '@/styles/admin-tokens.css';

const AdminUserPasswordModal = lazy(() =>
  import('@/features/admin/users/AdminUserPasswordModal').then((m) => ({ default: m.AdminUserPasswordModal })),
);

const LIMIT_PRESETS_SUPER = [50, 100, 250, 500] as const;
const LIMIT_PRESETS_STD = [25, 50, 100] as const;

export const AdminUsersPage: React.FC = () => {
  const {
    rows,
    total,
    loading,
    error,
    reload,
    updatingId,
    updateUserRole,
    patchUser,
    revokeUserSessions,
    clearError,
    page,
    setPage,
    totalPages,
    qDraft,
    setQDraft,
    bulkApply,
    limit,
    setLimit,
    maxLimit,
    sort,
    setSort,
    searchApplied,
  } = useAdminUsersDashboardView({ defaultLimit: 100 });
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const { showSuccess, showError } = useToastBridge();
  const [clinics, setClinics] = useState<AdminClinicRow[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; label: string } | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSuper) return;
    void fetchAdminClinics()
      .then((r) => setClinics(r.clinics ?? []))
      .catch(() => setClinics([]));
  }, [isSuper]);

  const rowHeight = isSuper ? ADMIN_USER_ROW_HEIGHT_SUPER : ADMIN_USER_ROW_HEIGHT_STANDARD;

  const estimateSize = useCallback(() => rowHeight, [rowHeight]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: isSuper ? 14 : 10,
    getItemKey: useCallback(
      (index: number) => {
        const id = rows[index]?.id;
        return id ?? index;
      },
      [rows],
    ),
  });

  /** Scroll to top when dataset identity changes (filter/sort/page). */
  useEffect(() => {
    const el = parentRef.current;
    if (el) el.scrollTop = 0;
  }, [page, searchApplied, sort]);

  /** Selection IDs from other pages/filters are invalid — clear to avoid mistaken bulk actions. */
  useEffect(() => {
    setSelected(new Set());
  }, [page, searchApplied, sort]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    if (!isSuper) return;
    setSelected(new Set(rows.map((r) => r.id)));
  }, [isSuper, rows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const onBulkDeactivate = useCallback(() => {
    if (!isSuper || selected.size === 0) return;
    if (!window.confirm(`Disable ${selected.size} user(s)?`)) return;
    const ids = [...selected].filter((id) => id !== user?.id);
    void (async () => {
      clearError();
      const ok = await bulkApply(ids, { isActive: false });
      if (ok) {
        showSuccess('Bulk suspend complete');
        clearSelection();
      } else showError('Bulk suspend failed');
    })();
  }, [isSuper, selected, user?.id, bulkApply, clearError, showSuccess, showError, clearSelection]);

  const onPasswordResetRequest = useCallback((userId: string, label: string) => {
    setPasswordTarget({ id: userId, label });
  }, []);

  const handlePasswordConfirm = useCallback(
    async (password: string) => {
      const t = passwordTarget;
      if (!t) return;
      setPasswordTarget(null);
      clearError();
      const ok = await patchUser(t.id, { password });
      if (ok) showSuccess('Password reset');
      else showError('Password update failed');
    },
    [passwordTarget, patchUser, clearError, showSuccess, showError],
  );

  const updateUserRoleStable = updateUserRole;
  const patchUserStable = patchUser;
  const revokeUserSessionsStable = revokeUserSessions;

  const onScrollRegionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const el = parentRef.current;
      if (!el) return;
      const v = rowVirtualizer;
      const view = el.clientHeight;
      if (e.key === 'Home') {
        e.preventDefault();
        v.scrollToOffset(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        v.scrollToOffset(v.getTotalSize());
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        v.scrollToOffset(Math.min(v.getTotalSize(), el.scrollTop + view * 0.9));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        v.scrollToOffset(Math.max(0, el.scrollTop - view * 0.9));
      }
    },
    [rowVirtualizer],
  );

  const gridTemplateColumns = isSuper ? '36px minmax(140px,1fr) minmax(160px,1.2fr)' : 'minmax(140px,1fr) minmax(160px,1.2fr)';

  const limitOptions = useMemo(() => {
    const presets: number[] = isSuper
      ? [...LIMIT_PRESETS_SUPER]
      : [...LIMIT_PRESETS_STD].filter((n) => n <= maxLimit);
    if (!presets.includes(limit)) presets.push(limit);
    return presets.sort((a, b) => a - b);
  }, [isSuper, maxLimit, limit]);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>User management</h1>
        <p className="tenant-page-lead">
          Server-paginated directory (<code>?page=&amp;q=&amp;limit=&amp;sort=</code>). Rows virtualize client-side for smooth
          scrolling on large pages (up to {maxLimit} rows per request for SUPER_ADMIN).
        </p>
        {!loading && !error ? (
          <p style={{ margin: 0, color: 'var(--neo-text-muted)' }}>
            Total matching: {total} · Page {page} / {totalPages} · {limit} rows/page
          </p>
        ) : null}
      </div>

      <div className="admin-user-toolbar">
        <input
          type="search"
          className="neo-input"
          placeholder="Search name, email, clinic…"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          aria-label="Filter users"
        />
        <label className="admin-user-sort-label">
          <span className="admin-user-sort-span">Sort</span>
          <select
            className="neo-input admin-user-sort-select"
            value={sort}
            onChange={(e) => setSort(parseAdminUserDirectorySort(e.target.value))}
            aria-label="Sort users"
          >
            {ADMIN_USER_DIRECTORY_SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        {isSuper ? (
          <label className="admin-user-sort-label">
            <span className="admin-user-sort-span">Rows / page</span>
            <select
              className="neo-input admin-user-sort-select"
              value={limit}
              onChange={(e) => setLimit(Number.parseInt(e.target.value, 10))}
              aria-label="Rows per page"
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="neo-btn neo-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button
            type="button"
            className="neo-btn neo-btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
        {isSuper ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={selectAllOnPage}>
              Select page
            </button>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={clearSelection}>
              Clear selection
            </button>
            <button
              type="button"
              className="neo-btn neo-btn-secondary"
              disabled={selected.size === 0 || updatingId === '__bulk__'}
              onClick={onBulkDeactivate}
            >
              Suspend selected ({selected.size})
            </button>
          </div>
        ) : null}
      </div>

      {error ? <ApiError message={error} title="Could not load users" onRetry={() => void reload()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="admin-user-grid-shell">
          <div
            className="admin-user-colhead"
            style={{
              display: 'grid',
              gridTemplateColumns,
              gap: 12,
            }}
            aria-hidden={!isSuper}
          >
            {isSuper ? <span className="admin-user-colhead-muted">Sel</span> : null}
            <span className="admin-user-colhead-strong" role="columnheader">
              User
            </span>
            <span className="admin-user-colhead-strong" role="columnheader">
              {isSuper ? 'Governance' : 'Role & clinic'}
            </span>
          </div>
          <div
            ref={parentRef}
            className="admin-user-scroll"
            tabIndex={0}
            role="grid"
            aria-rowcount={rows.length}
            aria-label="User directory"
            data-interactive-grid="true"
            onKeyDown={onScrollRegionKeyDown}
          >
            {!rows.length && !error ? (
              <p style={{ padding: 16, margin: 0, color: '#64748b' }}>No users on this page.</p>
            ) : null}
            <div
              className="admin-user-virtual-inner"
              style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
            >
              {rowVirtualizer.getVirtualItems().map((vr) => {
                const row = rows[vr.index];
                if (!row) return null;
                const busy = updatingId === row.id || updatingId === '__bulk__';
                return (
                  <div
                    key={vr.key}
                    data-index={vr.index}
                    className="admin-user-virtual-row"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      minHeight: rowHeight,
                      transform: `translateY(${vr.start}px)`,
                    }}
                  >
                    <AdminUserGridRow
                      u={row}
                      isSuper={isSuper}
                      selfId={user?.id}
                      clinics={clinics}
                      selected={selected.has(row.id)}
                      busy={busy}
                      onToggleSelect={toggleSelect}
                      clearError={clearError}
                      showSuccess={showSuccess}
                      showError={showError}
                      updateUserRole={updateUserRoleStable}
                      patchUser={patchUserStable}
                      revokeUserSessions={revokeUserSessionsStable}
                      onPasswordResetRequest={onPasswordResetRequest}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <AdminUserPasswordModal
          open={Boolean(passwordTarget)}
          userLabel={passwordTarget?.label ?? ''}
          onCancel={() => setPasswordTarget(null)}
          onConfirm={(pw) => void handlePasswordConfirm(pw)}
        />
      </Suspense>
    </div>
  );
};
