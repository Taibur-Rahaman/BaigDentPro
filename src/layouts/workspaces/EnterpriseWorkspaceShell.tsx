import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PracticeWorkspaceController } from '@/hooks/view/PracticeWorkspaceController';

export interface EnterpriseWorkspaceShellProps {
  /** Reserved: could steer platform admins away from clinical chrome on specific paths. */
  redirectFromClinicalPracticeRoutes?: boolean;
}

/**
 * Platform / enterprise roles that still use the clinical desk under `/dashboard/*`.
 * Behaves like clinic shell today; prop kept for API compatibility with {@link PracticeWorkspacePage}.
 */
export const EnterpriseWorkspaceShell: React.FC<EnterpriseWorkspaceShellProps> = (_props) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <PracticeWorkspaceController
      onLogout={handleLogout}
      userName={user?.name}
      userRole={user?.role}
      userClinicId={user?.clinicId ?? undefined}
      currentUserId={user?.id}
    />
  );
};
