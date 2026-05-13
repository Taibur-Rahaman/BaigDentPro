import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranchView } from '@/hooks/view/useBranchView';
import { useOrganizationView } from '@/hooks/view/useOrganizationView';

export const NetworkDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const org = useOrganizationView([]);
  const branch = useBranchView(user?.clinicId ?? '');

  return (
    <div>
      <h1 className="pp-title">Hospital network</h1>
      <p className="pp-muted">Epic-style shell — data APIs land in follow-up services.</p>
      <div className="pp-card">
        <div className="pp-row-between">
          <span>Active org</span>
          <strong style={{ fontSize: '0.85rem' }}>{org[0]?.name ?? '—'}</strong>
        </div>
        <div className="pp-row-between" style={{ marginTop: 8 }}>
          <span>Resolved branch</span>
          <strong style={{ fontSize: '0.85rem' }}>{branch.name}</strong>
        </div>
      </div>
    </div>
  );
};
