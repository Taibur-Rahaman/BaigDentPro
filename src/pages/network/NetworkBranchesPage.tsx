import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranchView } from '@/hooks/view/useBranchView';

export const NetworkBranchesPage: React.FC = () => {
  const { user } = useAuth();
  const b = useBranchView(user?.clinicId ?? '');

  return (
    <div>
      <h1 className="pp-title">Branches</h1>
      <div className="pp-card">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Primary branch for current clinic: <strong>{b.name}</strong>
        </p>
        <p className="pp-muted" style={{ marginBottom: 0 }}>
          Multi-site directory sync is enforced in `coreOrganizationEngine` / server, not in this list.
        </p>
      </div>
    </div>
  );
};
