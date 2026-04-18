import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AdminDashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `dashboard-sidebar-link${isActive ? ' dashboard-sidebar-link-active' : ''}`;

  return (
    <div className="dashboard-shell admin-panel-shell">
      <aside className="dashboard-sidebar" aria-label="Admin panel navigation">
        <div className="dashboard-sidebar-brand">
          <img src="/logo.png" alt="" width={32} height={32} />
          <span>Admin</span>
        </div>
        <nav className="dashboard-sidebar-nav">
          <NavLink to="/dashboard/admin" end className={linkClass}>
            <i className="fa-solid fa-gauge-high" aria-hidden />
            Overview
          </NavLink>
          <NavLink to="/dashboard/admin/users" className={linkClass}>
            <i className="fa-solid fa-users" aria-hidden />
            Users
          </NavLink>
          <NavLink to="/dashboard/admin/clinics" className={linkClass}>
            <i className="fa-solid fa-hospital" aria-hidden />
            Clinics
          </NavLink>
          <NavLink to="/dashboard/admin/orders" className={linkClass}>
            <i className="fa-solid fa-file-invoice-dollar" aria-hidden />
            SaaS orders
          </NavLink>
          <NavLink to="/dashboard/admin/logs" className={linkClass}>
            <i className="fa-solid fa-clipboard-list" aria-hidden />
            Audit logs
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            <i className="fa-solid fa-arrow-left" aria-hidden />
            Tenant dashboard
          </NavLink>
        </nav>
      </aside>
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
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
