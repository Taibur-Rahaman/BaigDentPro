import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RoleKeyword } from '@/lib/roles';
import { requireAnyRoleUI } from '@/lib/roles';

type RoleGateProps = {
  /** User must match at least one keyword (expanded role set) or literal role string. */
  allow: Array<RoleKeyword | string>;
  children: React.ReactNode;
};

export const RoleGate: React.FC<RoleGateProps> = ({ allow, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="tenant-loading" role="status" style={{ padding: '2rem' }}>
        <div className="neo-loading-spinner tenant-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!requireAnyRoleUI(user?.role, allow)) {
    return (
      <div className="tenant-page" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Unauthorized</h1>
        <p style={{ color: 'var(--neo-text-muted, #64748b)', margin: 0 }}>
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
