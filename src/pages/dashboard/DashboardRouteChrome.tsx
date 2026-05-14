import React, { useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isClinicalWorkspacePathname } from '@/pages/practice/practiceNav';
import { isStarterStaffRole } from '@/lib/starterStaffRoles';
import { DashboardLayout } from '@/pages/dashboard/DashboardLayout';
import { useStarterDashboardGuards } from '@/routes/starterDashboardRedirect';

/**
 * Starter staff on flat `/dashboard/<practice>` routes get practice shell only — `DashboardLayout`
 * (shop / clinic DPMS nav) is not mounted. Other `/dashboard/*` routes still use `DashboardLayout`.
 */
export const DashboardRouteChrome: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: starterGuardLoading, redirectElement } = useStarterDashboardGuards();
  const role = (user?.role ?? '').trim();
  const starter = isStarterStaffRole(role);
  const practicePath = isClinicalWorkspacePathname(location.pathname);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  if (redirectElement) {
    return redirectElement;
  }

  if (starterGuardLoading) {
    return (
      <div className="tenant-loading" role="status" style={{ padding: '2rem' }}>
        <div className="neo-loading-spinner tenant-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (starter && practicePath) {
    return (
      <div className="dashboard-shell dashboard-shell--clinical-staff">
        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar-spacer" />
            <div className="dashboard-topbar-user">
              <span className="dashboard-topbar-email">{user?.email || '—'}</span>
              <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void handleLogout()}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden />
                Logout
              </button>
            </div>
          </header>
          <div className="dashboard-content" role="main">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return <DashboardLayout />;
};
