import React, { useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteLogo } from '@/hooks/useSiteLogo';

type TenantShellNavProps = {
  userName?: string;
  /** Subscription tier label (e.g. FREE, PRO). */
  planLabel?: string;
  /** Resolved product feature flags from tenant (server-backed); omit or partial → permissive UI. */
  productFeatures?: Record<string, boolean>;
};

export const TenantShellNav: React.FC<TenantShellNavProps> = ({ userName, planLabel, productFeatures }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const siteLogo = useSiteLogo();
  const showShopNav = productFeatures?.shop_access !== false;

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return (
    <header className="tenant-shell-nav" role="banner">
      <div className="tenant-shell-nav-inner">
        <NavLink to="/dashboard" className="tenant-shell-brand" end>
          <img src={siteLogo} alt="" className="tenant-shell-logo" width={36} height={36} />
          <span className="tenant-shell-title">BaigDentPro</span>
        </NavLink>

        <nav className="tenant-shell-links" aria-label="Main">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `tenant-shell-link${isActive ? ' tenant-shell-link-active' : ''}`}
          >
            <i className="fa-solid fa-chart-pie" aria-hidden />
            Dashboard
          </NavLink>
          {showShopNav ? (
            <NavLink
              to="/dashboard/products"
              className={({ isActive }) => `tenant-shell-link${isActive ? ' tenant-shell-link-active' : ''}`}
            >
              <i className="fa-solid fa-box" aria-hidden />
              Products
            </NavLink>
          ) : null}
          {showShopNav ? (
            <NavLink
              to="/dashboard/orders"
              className={({ isActive }) => `tenant-shell-link${isActive ? ' tenant-shell-link-active' : ''}`}
            >
              <i className="fa-solid fa-receipt" aria-hidden />
              Orders
            </NavLink>
          ) : null}
        </nav>

        <div className="tenant-shell-actions">
          {planLabel ? (
            <span className="tenant-shell-plan" title="Current subscription plan">
              {planLabel}
            </span>
          ) : null}
          {userName ? <span className="tenant-shell-user">{userName}</span> : null}
          <button type="button" className="tenant-shell-logout neo-btn neo-btn-secondary" onClick={() => void handleLogout()}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
