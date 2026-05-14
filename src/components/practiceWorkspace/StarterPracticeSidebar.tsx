import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { STARTER_SIDEBAR_ITEMS } from '@/config/practiceSidebar/starterSidebarItems';
import { devAssertDoctorStarterSidebar } from '@/lib/devAssertDoctorStarterSidebar';
import { practiceWorkspaceHref } from '@/pages/practice/practiceNav';
import type { PracticeNavSection } from '@/pages/practice/practiceNav';

export type StarterPracticeSidebarProps = {
  userName: string;
  userRole?: string;
  activeNav: PracticeNavSection;
  siteLogo: string;
  onLogout: () => void;
};

function StarterPracticeSidebarInner({
  userName,
  userRole,
  activeNav,
  siteLogo,
  onLogout,
}: StarterPracticeSidebarProps) {
  useEffect(() => {
    devAssertDoctorStarterSidebar(userRole);
  }, [userRole]);

  return (
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
        {STARTER_SIDEBAR_ITEMS.map((item) => {
          const routeActive = item.id === 'patients' && activeNav === 'patient-detail';
          return (
            <NavLink
              key={item.id}
              to={practiceWorkspaceHref(item.pathSegment)}
              className={({ isActive }) => `sidebar-item${isActive || routeActive ? ' active' : ''}`}
              end={item.end ?? false}
            >
              <i className={item.iconClass}></i> <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export const StarterPracticeSidebar = React.memo(StarterPracticeSidebarInner);
