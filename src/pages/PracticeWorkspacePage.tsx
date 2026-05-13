import React from 'react';
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
 * Data loading resilience: optional plan-gated modules (e.g. invoices, lab) use
 * soft fallbacks in `loadPracticeLists`; failed core EMR requests still surface
 * as bundle errors — this component does not need to gate on those.
 */
export const PracticeWorkspacePage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return workspaceLoading;
  }

  const workspace = getWorkspaceByRole(user?.role);

  const isDev =
    import.meta.env.DEV ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
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

  switch (workspace.type) {
    case 'STARTER_WORKSPACE':
      return <StarterWorkspaceShell />;
    case 'CLINIC_WORKSPACE':
      return <ClinicWorkspaceShell capabilities={workspace.capabilities} />;
    case 'ENTERPRISE_WORKSPACE':
      return <EnterpriseWorkspaceShell redirectFromClinicalPracticeRoutes />;
    case 'SHOP_WORKSPACE':
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to={STARTER_PRACTICE_HOME} replace />;
  }
};
