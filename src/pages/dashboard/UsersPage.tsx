import React from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/components/ApiError';
import { useAdminUsersDashboardView } from '@/hooks/view/useAdminUsersDashboardView';
import type { AdminUserRow } from '@/types/adminPanel';

const ROLE_OPTIONS = ['ADMIN', 'CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'TENANT', 'SUPER_ADMIN'] as const;

export const UsersPage: React.FC = () => {
  const {
    rows,
    loading,
    error,
    page,
    setPage,
    totalPages,
    updatingId,
    reload,
    updateUserRole,
    clearError,
    limit,
  } = useAdminUsersDashboardView({ defaultLimit: 25 });

  const handleRoleChange = (userId: string, nextRole: string) => {
    clearError();
    void updateUserRole(userId, nextRole);
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Users &amp; roles</h1>
        <p className="tenant-page-lead">Clinic directory and role management for administrators.</p>
        <div style={{ marginTop: 12 }}>
          <Link to="/dashboard/invites" className="neo-btn neo-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-user-plus" aria-hidden /> Invite user
          </Link>
        </div>
      </div>
      {error ? <ApiError message={error} title="Could not load users" onRetry={() => void reload()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="tenant-card" style={{ overflow: 'auto' }}>
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Clinic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u: AdminUserRow) => (
                <tr key={u.id}>
                  <td>{u.name ?? '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="neo-input"
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(ev) => handleRoleChange(u.id, ev.target.value)}
                      aria-label={`Role for ${u.email}`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{u.clinicName ?? u.clinicId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="neo-btn neo-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Prev
            </button>
            <span style={{ fontSize: 14 }}>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="neo-btn neo-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--neo-text-muted, #64748b)', marginBottom: 0 }}>
            Showing up to {limit} users per page.
          </p>
        </div>
      )}
    </div>
  );
};
