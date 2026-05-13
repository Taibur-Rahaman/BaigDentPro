import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteLogo } from '@/hooks/useSiteLogo';
import {
  canAccessCommerceOnlyAccount,
  canAccessEnterpriseAdminRoute,
} from '@/lib/routeAccess';
import { isClinicalWorkspacePathname } from '@/pages/practice/practiceNav';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = (user?.role ?? '').trim();
  const isCommerceOnly = canAccessCommerceOnlyAccount(role);
  const showUsers = canAccessEnterpriseAdminRoute(role) && role !== 'SUPER_ADMIN';
  const isSuper = role === 'SUPER_ADMIN';
  const isClinicAdmin = role === 'CLINIC_ADMIN';
  const isClinicOwner = role === 'CLINIC_OWNER';
  const isDoctor = role === 'DOCTOR';
  const isReception = role === 'RECEPTIONIST';
  const hideClinicDpmsSidebar = isDoctor || isReception || isCommerceOnly;
  const siteLogo = useSiteLogo();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `dashboard-sidebar-link${isActive ? ' dashboard-sidebar-link-active' : ''}`;

  return (
    <div className={`dashboard-shell${hideClinicDpmsSidebar ? ' dashboard-shell--clinical-staff' : ''}`}>
      {!hideClinicDpmsSidebar ? (
        <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
          <div className="dashboard-sidebar-brand">
            <img src={siteLogo} alt="" width={32} height={32} />
            <span>BaigDentPro</span>
          </div>
          <nav className="dashboard-sidebar-nav">
          <NavLink to="/dashboard" end className={linkClass}>
            <i className="fa-solid fa-chart-pie" aria-hidden />
            Shop dashboard
          </NavLink>

          {canAccessEnterpriseAdminRoute(role) ? (
            <NavLink to="/dashboard/admin" className={linkClass} title="Enterprise Control Center — platform administration">
              <i className="fa-solid fa-building-columns" aria-hidden />
              Enterprise Control Center
            </NavLink>
          ) : null}

          {isClinicAdmin ? (
            <>
              <NavLink to="/dashboard/invites" className={linkClass}>
                <i className="fa-solid fa-envelope-open-text" aria-hidden />
                Team &amp; invites
              </NavLink>
              <NavLink to="/dashboard/reports" className={linkClass}>
                <i className="fa-solid fa-file-lines" aria-hidden />
                Reports
              </NavLink>
              <NavLink to="/dashboard/subscription" className={linkClass}>
                <i className="fa-solid fa-credit-card" aria-hidden />
                Subscription
              </NavLink>
              <NavLink to="/dashboard/clinic-profile" className={linkClass}>
                <i className="fa-solid fa-hospital-user" aria-hidden />
                Clinic profile
              </NavLink>
            </>
          ) : null}

          {isClinicOwner && !isClinicAdmin ? (
            <NavLink to="/dashboard/clinic-profile" className={linkClass}>
              <i className="fa-solid fa-hospital-user" aria-hidden />
              Clinic profile
            </NavLink>
          ) : null}

          {(isClinicAdmin || isDoctor || isReception) && !isCommerceOnly ? (
            <NavLink to="/dashboard/branches" className={linkClass}>
              <i className="fa-solid fa-code-branch" aria-hidden />
              Branches
            </NavLink>
          ) : null}

          {isDoctor ? (
            <>
              <NavLink to="/dashboard/patients" className={linkClass}>
                <i className="fa-solid fa-user-injured" aria-hidden />
                Patients
              </NavLink>
              <NavLink to="/dashboard/prescriptions" className={linkClass}>
                <i className="fa-solid fa-prescription" aria-hidden />
                Prescriptions
              </NavLink>
              <NavLink to="/dashboard/appointments" className={linkClass}>
                <i className="fa-solid fa-calendar-check" aria-hidden />
                Appointments
              </NavLink>
              <NavLink to="/dashboard/reports" className={linkClass}>
                <i className="fa-solid fa-chart-column" aria-hidden />
                Reports
              </NavLink>
            </>
          ) : null}

          {isReception ? (
            <>
              <NavLink to="/dashboard/patients" className={linkClass}>
                <i className="fa-solid fa-user-injured" aria-hidden />
                Patients
              </NavLink>
              <NavLink to="/dashboard/appointments" className={linkClass}>
                <i className="fa-solid fa-calendar-check" aria-hidden />
                Appointments
              </NavLink>
              <NavLink to="/dashboard/prescriptions" className={linkClass}>
                <i className="fa-solid fa-prescription" aria-hidden />
                Prescriptions
              </NavLink>
              <NavLink to="/dashboard/billing" className={linkClass}>
                <i className="fa-solid fa-file-invoice-dollar" aria-hidden />
                Billing
              </NavLink>
              <NavLink to="/dashboard/reports" className={linkClass}>
                <i className="fa-solid fa-chart-column" aria-hidden />
                Reports
              </NavLink>
            </>
          ) : null}

          {(isClinicAdmin || isDoctor || isReception || isSuper) && !isCommerceOnly ? (
            <>
              <NavLink to="/dashboard/insurance" className={linkClass}>
                <i className="fa-solid fa-file-shield" aria-hidden />
                Insurance
              </NavLink>
              <NavLink to="/dashboard/calendar" className={linkClass}>
                <i className="fa-solid fa-calendar-days" aria-hidden />
                Clinic calendar
              </NavLink>
              <NavLink to="/dashboard/communication" className={linkClass}>
                <i className="fa-solid fa-comments" aria-hidden />
                Communications
              </NavLink>
              <NavLink to="/dashboard/inventory" className={linkClass}>
                <i className="fa-solid fa-warehouse" aria-hidden />
                Inventory
              </NavLink>
              <NavLink to="/dashboard/staff-schedule" className={linkClass}>
                <i className="fa-solid fa-user-clock" aria-hidden />
                Staff schedule
              </NavLink>
            </>
          ) : null}

          {(isClinicAdmin || isSuper) && !isCommerceOnly ? (
            <>
              <NavLink to="/dashboard/plans" className={linkClass}>
                <i className="fa-solid fa-layer-group" aria-hidden />
                Plans
              </NavLink>
              <NavLink to="/dashboard/billing-console" className={linkClass}>
                <i className="fa-solid fa-file-invoice" aria-hidden />
                Billing console
              </NavLink>
              <NavLink to="/dashboard/clinic-control" className={linkClass}>
                <i className="fa-solid fa-sliders" aria-hidden />
                Clinic control
              </NavLink>
              <NavLink to="/dashboard/patient-portal" className={linkClass}>
                <i className="fa-solid fa-globe" aria-hidden />
                Patient portal
              </NavLink>
            </>
          ) : null}

          {isCommerceOnly || isClinicAdmin || isSuper ? (
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

          {showUsers && !isSuper ? (
            <NavLink to="/dashboard/admin" className={linkClass}>
              <i className="fa-solid fa-shield-halved" aria-hidden />
              Admin panel
            </NavLink>
          ) : null}

          {(isClinicAdmin || isSuper || isDoctor || isReception) && !isCommerceOnly ? (
            <NavLink to="/dashboard/activity" className={linkClass}>
              <i className="fa-solid fa-clock-rotate-left" aria-hidden />
              Activity
            </NavLink>
          ) : null}

          <NavLink to="/dashboard/settings" className={linkClass}>
            <i className="fa-solid fa-gear" aria-hidden />
            Settings
          </NavLink>
          {!isCommerceOnly ? (
            <NavLink
              to="/dashboard/overview"
              className={() =>
                linkClass({
                  isActive: isClinicalWorkspacePathname(location.pathname),
                })
              }
            >
              <i className="fa-solid fa-tooth" aria-hidden />
              Practice overview
            </NavLink>
          ) : null}
        </nav>
      </aside>
      ) : null}
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
