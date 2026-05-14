import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PracticeWorkspaceController } from '@/hooks/view/PracticeWorkspaceController';

/**
 * Limited clinical desk (starter): same controller as clinic; path allowlisting lives in
 * {@link PracticeWorkspacePage} via {@link isStarterPracticePathAllowed}.
 */
export const StarterWorkspaceShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <PracticeWorkspaceController
      practiceSidebarVariant="starter"
      onLogout={handleLogout}
      userName={user?.name}
      userRole={user?.role}
      userClinicId={user?.clinicId ?? undefined}
      currentUserId={user?.id}
    />
  );
};
