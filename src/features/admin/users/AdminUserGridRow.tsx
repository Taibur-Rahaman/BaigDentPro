import React, { memo, useMemo } from 'react';
import type { AdminClinicRow, AdminUserRow } from '@/types/adminPanel';
import { superRoleSelectOptions } from '@/features/admin/users/superRoleOptions';

const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED'] as const;

export type AdminUserGridRowProps = {
  u: AdminUserRow;
  isSuper: boolean;
  selfId: string | undefined;
  clinics: AdminClinicRow[];
  selected: boolean;
  busy: boolean;
  onToggleSelect: (id: string) => void;
  clearError: () => void;
  showSuccess: (m: string) => void;
  showError: (m: string) => void;
  updateUserRole: (id: string, role: string) => Promise<boolean>;
  patchUser: (id: string, p: Record<string, unknown>) => Promise<boolean>;
  revokeUserSessions: (id: string) => Promise<boolean>;
  onPasswordResetRequest: (userId: string, label: string) => void;
};

function AdminUserGridRowInner(props: AdminUserGridRowProps) {
  const {
    u,
    isSuper,
    selfId,
    clinics,
    selected,
    busy,
    onToggleSelect,
    clearError,
    showSuccess,
    showError,
    updateUserRole,
    patchUser,
    revokeUserSessions,
    onPasswordResetRequest,
  } = props;

  const roleOptions = superRoleSelectOptions(u.role);
  const normalizedLifecycle = (u.accountStatus ?? 'ACTIVE').toUpperCase();
  const lifecycleSelectValue = (
    ACCOUNT_STATUSES as readonly string[]
  ).includes(normalizedLifecycle)
    ? normalizedLifecycle
    : 'PENDING';
  const clinicSelectOptions = useMemo(() => {
    const base = clinics.map((c) => ({ id: c.id, name: c.name }));
    if (u.clinicId && !base.some((c) => c.id === u.clinicId)) {
      return [
        {
          id: u.clinicId,
          name: u.clinic?.name ?? u.clinicName ?? u.clinicId,
        },
        ...base,
      ];
    }
    return base;
  }, [clinics, u.clinic?.name, u.clinicId, u.clinicName]);
  const canActivate = !u.isActive || normalizedLifecycle !== 'ACTIVE' || !u.isApproved;
  const activationLabel = canActivate ? 'Activate now' : 'Suspend';

  return (
    <div
      className="admin-user-row-card"
      style={{
        display: 'grid',
        gridTemplateColumns: isSuper ? '36px minmax(140px,1fr) minmax(160px,1.2fr)' : 'minmax(140px,1fr) minmax(160px,1.2fr)',
        gap: 12,
        alignItems: 'start',
        minHeight: 'inherit',
        boxSizing: 'border-box',
      }}
    >
      {isSuper ? (
        <label style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
          <input
            type="checkbox"
            checked={selected}
            disabled={u.id === selfId}
            onChange={() => onToggleSelect(u.id)}
            aria-label={`Select ${u.email}`}
          />
        </label>
      ) : null}
      <div>
        <div style={{ fontWeight: 600 }}>{u.name}</div>
        <div style={{ fontSize: 13, color: 'var(--neo-text-muted)' }}>{u.email}</div>
        <code style={{ fontSize: 11, color: '#94a3b8' }}>{u.id}</code>
      </div>
      <div>
        {isSuper ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--neo-text-muted)' }}>Role</span>
              <select
                className="neo-input"
                style={{ fontSize: 13 }}
                value={u.role}
                disabled={busy}
                onChange={(e) => {
                  void (async () => {
                    clearError();
                    const ok = await updateUserRole(u.id, e.target.value);
                    if (ok) showSuccess('Role updated');
                    else showError('Could not update role');
                  })();
                }}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--neo-text-muted)' }}>Clinic</span>
              <select
                className="neo-input"
                style={{ fontSize: 12 }}
                value={u.clinicId}
                disabled={busy}
                onChange={(e) => {
                  void (async () => {
                    clearError();
                    const ok = await patchUser(u.id, { clinicId: e.target.value });
                    if (ok) showSuccess('Clinic reassigned');
                    else showError('Could not move user');
                  })();
                }}
              >
                {clinicSelectOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--neo-text-muted)' }}>Lifecycle</span>
              <select
                className="neo-input"
                style={{ fontSize: 13 }}
                value={lifecycleSelectValue}
                disabled={busy}
                onChange={(e) => {
                  void (async () => {
                    clearError();
                    const st = e.target.value;
                    const lifecyclePayload: Record<string, unknown> =
                      st === 'ACTIVE'
                        ? { accountStatus: 'ACTIVE', isApproved: true, isActive: true }
                        : st === 'PENDING'
                          ? { accountStatus: 'PENDING', isApproved: false, isActive: false }
                          : { accountStatus: 'SUSPENDED', isActive: false };
                    const ok = await patchUser(u.id, lifecyclePayload);
                    if (ok) showSuccess('Lifecycle updated');
                    else showError('Could not update status');
                  })();
                }}
              >
                {ACCOUNT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="neo-btn neo-btn-secondary"
                disabled={busy || u.id === selfId}
                onClick={() => {
                  void (async () => {
                    clearError();
                    const payload: Record<string, unknown> = canActivate
                      ? isSuper
                        ? { isActive: true, isApproved: true, accountStatus: 'ACTIVE' }
                        : { isActive: true }
                      : isSuper
                        ? { isActive: false, accountStatus: 'SUSPENDED' }
                        : { isActive: false };
                    const ok = await patchUser(u.id, payload);
                    if (ok) showSuccess(canActivate ? 'User activated' : 'User suspended');
                    else showError('Could not toggle');
                  })();
                }}
              >
                {activationLabel}
              </button>
              <button
                type="button"
                className="neo-btn neo-btn-secondary"
                disabled={busy || u.id === selfId}
                onClick={() => {
                  void (async () => {
                    clearError();
                    const ok = await revokeUserSessions(u.id);
                    if (ok) showSuccess('Sessions revoked');
                    else showError('Revoke failed');
                  })();
                }}
              >
                Force logout
              </button>
              <button
                type="button"
                className="neo-btn neo-btn-secondary"
                disabled={busy}
                onClick={() => onPasswordResetRequest(u.id, u.email)}
              >
                Reset password
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14 }}>
            <div>
              <strong>{u.role}</strong>
            </div>
            <div style={{ marginTop: 6 }}>{u.clinic?.name || u.clinicName || '—'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Active: {u.isActive ? 'yes' : 'no'} · Approved: {u.isApproved ? 'yes' : 'no'}
            </div>
            <code style={{ fontSize: 11 }}>{u.clinicId}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function userVisualEqual(a: AdminUserRow, b: AdminUserRow): boolean {
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.name === b.name &&
    a.role === b.role &&
    a.clinicId === b.clinicId &&
    a.isActive === b.isActive &&
    a.isApproved === b.isApproved &&
    (a.accountStatus ?? '') === (b.accountStatus ?? '') &&
    (a.clinic?.name ?? a.clinicName ?? '') === (b.clinic?.name ?? b.clinicName ?? '')
  );
}

function rowPropsEqual(a: AdminUserGridRowProps, b: AdminUserGridRowProps): boolean {
  return (
    userVisualEqual(a.u, b.u) &&
    a.isSuper === b.isSuper &&
    a.selfId === b.selfId &&
    a.clinics === b.clinics &&
    a.selected === b.selected &&
    a.busy === b.busy &&
    a.onToggleSelect === b.onToggleSelect &&
    a.clearError === b.clearError &&
    a.showSuccess === b.showSuccess &&
    a.showError === b.showError &&
    a.updateUserRole === b.updateUserRole &&
    a.patchUser === b.patchUser &&
    a.revokeUserSessions === b.revokeUserSessions &&
    a.onPasswordResetRequest === b.onPasswordResetRequest
  );
}

/** Memoized row — parent must pass stable callbacks (`useCallback`) to avoid undoing memoization. */
export const AdminUserGridRow = memo(AdminUserGridRowInner, rowPropsEqual);
