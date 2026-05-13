import React from 'react';
import { useNetworkDemoRBAC } from '@/hooks/view/useNetworkDemoRBAC';

export const NetworkStaffPage: React.FC = () => {
  const { canBranch } = useNetworkDemoRBAC();

  return (
    <div>
      <h1 className="pp-title">Staff & roles</h1>
      <div className="pp-card">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Sample org role may access branch scope: <strong>{canBranch ? 'yes' : 'no'}</strong>
        </p>
      </div>
    </div>
  );
};
