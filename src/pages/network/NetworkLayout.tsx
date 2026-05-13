import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '@/pages/portal/patient-portal.css';

const linkClass = ({ isActive }: { isActive: boolean }) => `pp-nav-link${isActive ? ' pp-nav-link-active' : ''}`;

export const NetworkLayout: React.FC = () => (
  <div className="pp-shell patient-portal-root">
    <nav className="pp-top-nav" aria-label="Hospital network">
      <NavLink to="/network/dashboard" className={linkClass} end>
        Overview
      </NavLink>
      <NavLink to="/network/branches" className={linkClass}>
        Branches
      </NavLink>
      <NavLink to="/network/staff" className={linkClass}>
        Staff
      </NavLink>
      <NavLink to="/network/patients-global" className={linkClass}>
        Patients
      </NavLink>
      <NavLink to="/network/analytics" className={linkClass}>
        Analytics
      </NavLink>
    </nav>
    <main className="pp-main">
      <Outlet />
    </main>
  </div>
);
