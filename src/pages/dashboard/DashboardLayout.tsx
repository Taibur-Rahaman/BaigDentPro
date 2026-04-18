import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { requireRoleUI } from '@/lib/roles';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const showUsers = requireRoleUI(user?.role, 'ADMIN');
  const role = (user?.role ?? '').trim();
  const isSuper = role === 'SUPER_ADMIN';
  const isClinicAdmin = role === 'CLINIC_ADMIN';
  const isDoctor = role === 'DOCTOR';
  const isReception = role === 'RECEPTIONIST';
  const isTenant = role === 'TENANT';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `dashboard-sidebar-link${isActive ? ' dashboard-sidebar-link-active' : ''}`;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
        <div className="dashboard-sidebar-brand">
          <img src="/logo.png" alt="" width={32} height={32} />
          <span>BaigDentPro</span>
        </div>
        <nav className="dashboard-sidebar-nav">
          <NavLink to="/dashboard" end className={linkClass}>
            <i className="fa-solid fa-chart-pie" aria-hidden />
            Dashboard home
          </NavLink>

          {isSuper ? (
            <>
              <NavLink to="/dashboard/admin/clinics" className={linkClass}>
                <i className="fa-solid fa-hospital" aria-hidden />
                All clinics
              </NavLink>
              <NavLink to="/dashboard/admin/users" className={linkClass}>
                <i className="fa-solid fa-users" aria-hidden />
                All users
              </NavLink>
              <NavLink to="/dashboard/admin" className={linkClass}>
                <i className="fa-solid fa-chart-line" aria-hidden />
                Revenue analytics
              </NavLink>
            </>
          ) : null}

          {isClinicAdmin ? (
            <>
              <NavLink to="/dashboard/users" className={linkClass}>
                <i className="fa-solid fa-users" aria-hidden />
                Users &amp; roles
              </NavLink>
              <NavLink to="/dashboard/reports" className={linkClass}>
                <i className="fa-solid fa-file-lines" aria-hidden />
                Reports
              </NavLink>
              <NavLink to="/dashboard/subscription" className={linkClass}>
                <i className="fa-solid fa-credit-card" aria-hidden />
                Subscription
              </NavLink>
              <NavLink to="/dashboard/invites" className={linkClass}>
                <i className="fa-solid fa-envelope-open-text" aria-hidden />
                Invites
              </NavLink>
            </>
          ) : null}

          {(isClinicAdmin || isDoctor || isReception) && !isTenant ? (
            <NavLink to="/dashboard/branches" className={linkClass}>
              <i className="fa-solid fa-code-branch" aria-hidden />
              Branches
            </NavLink>
          ) : null}

          {isDoctor ? (
            <>
              <NavLink to="/dashboard/practice" className={linkClass}>
                <i className="fa-solid fa-user-injured" aria-hidden />
                Patients
              </NavLink>
              <NavLink to="/dashboard/practice" className={linkClass}>
                <i className="fa-solid fa-prescription" aria-hidden />
                Prescriptions
              </NavLink>
              <NavLink to="/dashboard/practice" className={linkClass}>
                <i className="fa-solid fa-calendar-check" aria-hidden />
                Appointments
              </NavLink>
            </>
          ) : null}

          {isReception ? (
            <>
              <NavLink to="/dashboard/practice" className={linkClass}>
                <i className="fa-solid fa-calendar-check" aria-hidden />
                Appointments
              </NavLink>
              <NavLink to="/dashboard/practice" className={linkClass}>
                <i className="fa-solid fa-file-invoice-dollar" aria-hidden />
                Billing
              </NavLink>
            </>
          ) : null}

          {isTenant || isClinicAdmin || isSuper ? (
            <>
              <NavLink to="/dashboard/products" className={linkClass}>
                <i className="fa-solid fa-box" aria-hidden />
                Products
              </NavLink>
              <NavLink to="/dashboard/orders" className={linkClass}>
                <i className="fa-solid fa-receipt" aria-hidden />
                Orders
              </NavLink>
            </>
          ) : null}

          {showUsers ? (
            <NavLink to="/dashboard/admin" className={linkClass}>
              <i className="fa-solid fa-shield-halved" aria-hidden />
              Admin panel
            </NavLink>
          ) : null}

          {(isClinicAdmin || isSuper || isDoctor || isReception) && !isTenant ? (
            <NavLink to="/dashboard/activity" className={linkClass}>
              <i className="fa-solid fa-clock-rotate-left" aria-hidden />
              Activity
            </NavLink>
          ) : null}

          <NavLink to="/dashboard/settings" className={linkClass}>
            <i className="fa-solid fa-gear" aria-hidden />
            Settings
          </NavLink>
          {!isTenant ? (
            <NavLink to="/dashboard/practice" className={linkClass}>
              <i className="fa-solid fa-tooth" aria-hidden />
              Practice workspace
            </NavLink>
          ) : null}
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
