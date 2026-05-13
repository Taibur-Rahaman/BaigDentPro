import React, { useEffect, useState } from 'react';
import api from '@/api';
import { SuperAdminCapabilityOverridesPanel } from '@/features/superAdmin/SuperAdminCapabilityOverridesPanel';
import { ApiError } from '@/components/ApiError';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { userMessageFromUnknown } from '@/lib/apiErrors';

/** SUPER_ADMIN-only: clinic capability matrix + overrides. */
export const AdminRolesCapabilitiesPage: React.FC = () => {
  const { showSuccess } = useToastBridge();
  const [clinics, setClinics] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superAdmin.clinics({ limit: 500 });
        if (!cancel) setClinics(res.clinics ?? []);
      } catch (e) {
        if (!cancel) setError(userMessageFromUnknown(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Roles &amp; permissions</h1>
        <p className="tenant-page-lead">
          Tenant-wide capability overrides on top of plan + RBAC (`/api/super-admin` + capability engine). DB role strings remain
          the source of truth for staff identity; this layer fine-tunes effective module access per clinic.
        </p>
      </div>
      {error ? <ApiError message={error} title="Could not load clinics" onRetry={() => window.location.reload()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading clinics…</span>
        </div>
      ) : (
        <SuperAdminCapabilityOverridesPanel clinics={clinics} showToast={(m) => showSuccess(m)} />
      )}
    </div>
  );
};
