import React, { useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PracticeWorkspaceProvider } from '@/contexts/practiceWorkspace/PracticeWorkspaceContext';
import { PracticeWorkspaceShell } from '@/pages/practice/workspace/PracticeWorkspaceShell';
import { useAuth } from '@/hooks/useAuth';
import { formatShellUserLabel } from '@/lib/professionalDisplay';

/**
 * Clinical workspace layout: shared PracticeWorkspace context + shell + child route outlets.
 */
export const PracticeWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return (
    <PracticeWorkspaceProvider>
      <PracticeWorkspaceShell
        onLogout={handleLogout}
        userName={user ? formatShellUserLabel(user) : undefined}
        userRole={user?.role}
        userClinicId={user?.clinicId ?? undefined}
        currentUserId={user?.id}
      />
      <Outlet />
    </PracticeWorkspaceProvider>
  );
};
