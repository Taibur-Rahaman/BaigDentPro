import React from 'react';
import { Navigate, Outlet, useLocation, NavLink } from 'react-router-dom';
import { PatientPortalAuthProvider, usePatientPortalAuth } from '@/pages/portal/PatientPortalAuthContext';
import '@/pages/portal/patient-portal.css';

function PatientPortalShellInner() {
  const { hydrated, isAuthed } = usePatientPortalAuth();
  const loc = useLocation();
  const isLogin = loc.pathname.endsWith('/login');

  if (!hydrated) {
    return (
      <div className="pp-shell pp-center">
        <p className="pp-muted">Loading patient portal…</p>
      </div>
    );
  }

  if (!isLogin && !isAuthed) {
    return <Navigate to="/portal/login" replace />;
  }

  if (isLogin && isAuthed) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => `pp-nav-link${isActive ? ' pp-nav-link-active' : ''}`;

  return (
    <div className="pp-shell patient-portal-root">
      {!isLogin ? (
        <nav className="pp-top-nav" aria-label="Patient portal">
          <NavLink to="/portal/dashboard" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/portal/book-appointment" className={linkClass}>
            Book
          </NavLink>
          <NavLink to="/portal/medical-records" className={linkClass}>
            Records
          </NavLink>
          <NavLink to="/portal/billing" className={linkClass}>
            Billing
          </NavLink>
        </nav>
      ) : null}
      <main className="pp-main">
        <Outlet />
      </main>
    </div>
  );
}

/** Mobile-first shell; auth provider + route gate for patient JWT session. */
export const PatientPortalLayout: React.FC = () => (
  <PatientPortalAuthProvider>
    <PatientPortalShellInner />
  </PatientPortalAuthProvider>
);
