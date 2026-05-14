import React from 'react';
import { NavLink } from 'react-router-dom';
import { practiceWorkspaceHref } from '@/pages/practice/practiceNav';
import type { PracticeNavSection } from '@/pages/practice/practiceNav';

export type ClinicPracticeSidebarProps = {
  userName: string;
  userRole?: string;
  activeNav: PracticeNavSection;
  siteLogo: string;
  onLogout: () => void;
  setAuxNav: (tab: PracticeNavSection) => void;
};

/**
 * Full clinic / platform practice desk sidebar (CLINIC_ADMIN, CLINIC_OWNER, SUPER_ADMIN).
 * Separate module from starter items — no shared menu array with {@link STARTER_SIDEBAR_ITEMS}.
 */
export const ClinicPracticeSidebar: React.FC<ClinicPracticeSidebarProps> = ({
  userName,
  userRole,
  activeNav,
  siteLogo,
  onLogout,
  setAuxNav,
}) => (
  <aside className="dashboard-sidebar">
    <div className="sidebar-header">
      <div className="sidebar-logo">
        <img src={siteLogo} alt="BaigDentPro" className="sidebar-logo-img" />
        <span>BaigDentPro</span>
      </div>
      <div className="sidebar-user">
        <i className="fa-solid fa-user-circle"></i>
        <span>{userName}</span>
      </div>
    </div>
    <nav className="sidebar-nav">
      <NavLink
        to={practiceWorkspaceHref('overview')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
        end
      >
        <i className="fa-solid fa-grid-2"></i> <span>Dashboard</span>
      </NavLink>
      {(userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') && (
        <button
          type="button"
          className={`sidebar-item ${activeNav === 'shop-dashboard' ? 'active' : ''}`}
          onClick={() => setAuxNav('shop-dashboard')}
        >
          <i className="fa-solid fa-store" /> <span>Shop</span>
        </button>
      )}
      <NavLink
        to={practiceWorkspaceHref('patients')}
        className={({ isActive }) =>
          `sidebar-item${isActive || activeNav === 'patient-detail' ? ' active' : ''}`
        }
      >
        <i className="fa-solid fa-user-group"></i> <span>Patients</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('prescription')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-prescription"></i> <span>New Prescription</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('prescriptions')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-file-waveform"></i> <span>All Prescriptions</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('appointments')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-calendar-check"></i> <span>Appointments</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('billing')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-credit-card"></i> <span>Billing</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('workspace-calendar')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-calendar-days"></i> <span>Clinic Calendar</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('reports')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-chart-column"></i> <span>Reports</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('lab')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-flask-vial"></i> <span>Lab Orders</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('drugs')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-capsules"></i> <span>Drug Database</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('sms')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-message"></i> <span>SMS & Messages</span>
      </NavLink>
      <NavLink
        to={practiceWorkspaceHref('workspace-settings')}
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      >
        <i className="fa-solid fa-gear"></i> <span>Settings</span>
      </NavLink>
      {(userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') && (
        <button
          type="button"
          className={`sidebar-item ${activeNav === 'clinic-admin' ? 'active' : ''}`}
          onClick={() => setAuxNav('clinic-admin')}
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}
        >
          <i className="fa-solid fa-user-shield"></i> <span>Clinic admin</span>
        </button>
      )}
      {userRole === 'SUPER_ADMIN' && (
        <button
          type="button"
          className={`sidebar-item ${activeNav === 'super-admin' ? 'active' : ''}`}
          onClick={() => setAuxNav('super-admin')}
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}
        >
          <i className="fa-solid fa-shield-halved"></i> <span>Super Admin</span>
        </button>
      )}
    </nav>
    <div className="sidebar-footer">
      <button type="button" className="sidebar-logout" onClick={onLogout}>
        <i className="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>
      </button>
    </div>
  </aside>
);
