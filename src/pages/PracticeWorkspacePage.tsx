import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  STARTER_PRACTICE_HOME,
  canAccessWorkspace,
  getWorkspaceByRole,
  isStarterPracticePathAllowed,
} from '@/config/workspaceResolver';
import {
  ClinicWorkspaceShell,
  EnterpriseWorkspaceShell,
  StarterWorkspaceShell,
} from '@/layouts/workspaces';
import { PracticeWorkspaceProvider } from '@/contexts/practiceWorkspace';
import { useDevExcessiveRerenderWarning } from '@/lib/devExcessiveRerenderWarning';

const workspaceLoading = (
  <div className="tenant-loading" role="status" style={{ padding: '2rem' }}>
    <div className="neo-loading-spinner tenant-spinner" />
    <span>Loading…</span>
  </div>
);

/**
 * Workspace router: ROLE → WORKSPACE → shell. Single place that reads `user.role`
 * for clinical `/dashboard/*` practice routes; shells and controller consume only
 * `workspaceType` + `capabilities`.
 *
 * Child routes render inside {@link PracticeWorkspaceController} via `<Outlet />`.
 */
export const PracticeWorkspacePage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useDevExcessiveRerenderWarning('PracticeWorkspacePage');

  const workspace = useMemo(() => getWorkspaceByRole(user?.role), [user?.role]);

  const workspaceShell = useMemo(() => {
    switch (workspace.type) {
      case 'STARTER_WORKSPACE':
        return <StarterWorkspaceShell key="starter-shell" />;
      case 'CLINIC_WORKSPACE':
        return <ClinicWorkspaceShell key="clinic-shell" capabilities={workspace.capabilities} />;
      case 'ENTERPRISE_WORKSPACE':
        return (
          <EnterpriseWorkspaceShell key="enterprise-shell" redirectFromClinicalPracticeRoutes />
        );
      default:
        return null;
    }
  }, [workspace]);

  const isDev =
    import.meta.env.DEV ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

  if (loading) {
    return workspaceLoading;
  }

  if (isDev) {
    console.assert(
      workspace.type !== 'CLINIC_WORKSPACE' || (user?.role ?? '').trim() !== 'DOCTOR',
      'Doctor should never resolve to Clinic workspace',
    );
  }

  if (!canAccessWorkspace(user?.role, workspace.type)) {
    return <Navigate to={STARTER_PRACTICE_HOME} replace />;
  }

  if (workspace.type === 'STARTER_WORKSPACE' && !isStarterPracticePathAllowed(location.pathname)) {
    return <Navigate to={STARTER_PRACTICE_HOME} replace />;
  }

  if (workspace.type === 'SHOP_WORKSPACE') {
    return <Navigate to="/dashboard" replace />;
  }

  if (workspaceShell == null) {
    return <Navigate to={STARTER_PRACTICE_HOME} replace />;
  }

  return (
    <PracticeWorkspaceProvider key={workspace.type}>
      {workspaceShell}
    </PracticeWorkspaceProvider>
  );
};
