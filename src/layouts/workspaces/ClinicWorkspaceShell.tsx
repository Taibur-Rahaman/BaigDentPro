import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PracticeWorkspaceController } from '@/hooks/view/PracticeWorkspaceController';
import type { ClinicWorkspaceCapabilities } from '@/config/workspaceResolver';

export interface ClinicWorkspaceShellProps {
  capabilities: ClinicWorkspaceCapabilities;
}

/** Full clinic-operator workspace shell (capabilities reserved for future nav gating). */
export const ClinicWorkspaceShell: React.FC<ClinicWorkspaceShellProps> = ({ capabilities: _capabilities }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <PracticeWorkspaceController
      practiceSidebarVariant="clinic"
      onLogout={handleLogout}
      userName={user?.name}
      userRole={user?.role}
      userClinicId={user?.clinicId ?? undefined}
      currentUserId={user?.id}
    />
  );
};
