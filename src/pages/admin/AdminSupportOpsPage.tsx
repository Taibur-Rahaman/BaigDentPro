import React, { useCallback, useEffect, useState } from 'react';
import {
  SuperAdminPendingApprovalsTable,
  type PendingRow,
} from '@/components/superAdmin/SuperAdminPendingApprovalsTable';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import api from '@/api';
import type { ApproveSignupPayload } from '@/lib/core/coreSuperAdminApi';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';

/** SUPER_ADMIN: signup queue + links into deeper practice workspace tools. */
export const AdminSupportOpsPage: React.FC = () => {
  const { showSuccess, showError } = useToastBridge();
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superAdmin.pendingSignups();
      const rows = Array.isArray(res.pending) ? (res.pending as PendingRow[]) : [];
      setPending(rows);
    } catch (e: unknown) {
      setPending([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Support &amp; operations</h1>
        <p className="tenant-page-lead">
          Pending clinic registrations. For prescriptions/patients and demo tooling, open <strong>Dashboard → Practice workspace</strong>{' '}
          and use the <strong>Super Admin</strong> tab (hits the same `/api/super-admin/*` endpoints).
        </p>
      </div>

      {error ? <ApiError message={error} title="Could not load approvals" onRetry={() => void reload()} /> : null}
      <div className="tenant-card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>Registration queue</h3>
        {loading ? (
          <div className="tenant-loading" role="status">
            <div className="neo-loading-spinner tenant-spinner" />
            <span>Loading…</span>
          </div>
        ) : (
          <SuperAdminPendingApprovalsTable
            pending={pending}
            showToast={(m) => showSuccess(m)}
            showError={(m) => showError(m)}
            onApprove={async (userId: string, payload: ApproveSignupPayload) => {
              await api.superAdmin.approveSignup(userId, payload);
              showSuccess('User approved');
              await reload();
            }}
            onReject={async (userId: string) => {
              await api.superAdmin.rejectSignup(userId);
              showSuccess('Signup rejected');
              await reload();
            }}
          />
        )}
      </div>
    </div>
  );
};
