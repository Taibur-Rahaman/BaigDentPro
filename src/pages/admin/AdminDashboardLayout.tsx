import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteLogo } from '@/hooks/useSiteLogo';

type NavItem = { to: string; label: string; icon: string; superOnly?: boolean; end?: boolean };

const STORAGE_KEY = 'enterprise-admin-sidebar-collapsed';

function useCmdPalette(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}

export const AdminDashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const siteLogo = useSiteLogo();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const enterpriseNav: { label: string; items: NavItem[] }[] = useMemo(
    () => [
      {
        label: 'Executive',
        items: [{ to: '/dashboard/admin', label: 'Executive dashboard', icon: 'fa-chart-line', end: true }],
      },
      {
        label: 'Governance',
        items: [
          { to: '/dashboard/admin/tenants', label: 'Tenant management', icon: 'fa-building' },
          { to: '/dashboard/admin/users', label: 'Users', icon: 'fa-users' },
          { to: '/dashboard/admin/roles-capabilities', label: 'Roles & permissions', icon: 'fa-shield-halved', superOnly: true },
        ],
      },
      {
        label: 'Finance',
        items: [
          { to: '/dashboard/admin/billing/orders', label: 'SaaS orders', icon: 'fa-bag-shopping' },
          {
            to: '/dashboard/admin/billing/plan-payments',
            label: 'Plan payments',
            icon: 'fa-file-invoice-dollar',
            superOnly: true,
          },
        ],
      },
      {
        label: 'Observability',
        items: [
          { to: '/dashboard/admin/monitoring', label: 'System monitoring', icon: 'fa-heart-pulse' },
          { to: '/dashboard/admin/security/audit', label: 'Security & audit', icon: 'fa-lock' },
        ],
      },
      {
        label: 'Experience',
        items: [
          { to: '/dashboard/admin/support', label: 'Support ops', icon: 'fa-life-ring', superOnly: true },
          { to: '/dashboard/admin/branding', label: 'Branding', icon: 'fa-image' },
          { to: '/dashboard/admin/settings', label: 'Settings center', icon: 'fa-gear' },
        ],
      },
    ],
    []
  );

  const flatNav = useMemo(() => {
    const out: NavItem[] = [];
    for (const g of enterpriseNav) {
      for (const i of g.items) {
        if (!i.superOnly || isSuper) out.push(i);
      }
    }
    return out;
  }, [enterpriseNav, isSuper]);

  const breadcrumb = useMemo(() => {
    const segs = location.pathname.replace(/^\//, '').split('/').filter(Boolean);
    return segs.join(' / ') || 'dashboard / admin';
  }, [location.pathname]);

  const [paletteOpen, setPaletteOpen] = useCmdPalette();
  const [paletteQ, setPaletteQ] = useState('');

  const paletteHits = useMemo(() => {
    const q = paletteQ.trim().toLowerCase();
    if (!q) return flatNav.slice(0, 8);
    return flatNav.filter((i) => `${i.label} ${i.to}`.toLowerCase().includes(q)).slice(0, 12);
  }, [flatNav, paletteQ]);

  const goPalette = useCallback(
    (to: string) => {
      setPaletteOpen(false);
      setPaletteQ('');
      navigate(to);
    },
    [navigate, setPaletteOpen]
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `enterprise-admin-nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="enterprise-admin-shell">
      <aside className={`enterprise-admin-sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Control center">
        <div className="enterprise-admin-sidebar-header">
          <img src={siteLogo} alt="" width={32} height={32} />
          {!collapsed ? (
            <div>
              <div className="enterprise-admin-brand-title">Control Center</div>
              <div className="enterprise-admin-brand-sub">Enterprise admin</div>
            </div>
          ) : null}
          <button
            type="button"
            className="enterprise-admin-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
          >
            <i className={`fa-solid ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`} aria-hidden />
          </button>
        </div>

        <div className="enterprise-admin-sidebar-scroll">
          {enterpriseNav.map((group) => {
            const items = group.items.filter((i) => !i.superOnly || isSuper);
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <div className="enterprise-admin-section-label">{group.label}</div>
                {items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={Boolean(item.end)} className={linkClass}>
                    <i className={`fa-solid ${item.icon}`} aria-hidden />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}

          <div className="enterprise-admin-section-label">Switch context</div>
          <NavLink to="/dashboard" className={linkClass}>
            <i className="fa-solid fa-hospital-user" aria-hidden />
            <span>Tenant dashboard</span>
          </NavLink>
        </div>
      </aside>

      <div className="enterprise-admin-main">
        <header className="enterprise-admin-topbar">
          <nav className="enterprise-admin-bc" aria-label="Breadcrumb">
            {breadcrumb}
          </nav>
          <span className="enterprise-admin-cmdkbd" aria-hidden title="Toggle command palette">
            ⌘K
          </span>
          <button
            type="button"
            className="neo-btn neo-btn-secondary"
            style={{ fontSize: 13 }}
            onClick={() => {
              setPaletteQ('');
              setPaletteOpen(true);
            }}
          >
            Search
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b', maxWidth: 220 }} className="eas-sr-hide">
              {user?.email ?? '—'}
            </span>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void handleLogout()}>
              Logout
            </button>
          </div>
        </header>

        <div className="enterprise-admin-frame">
          <Outlet />
        </div>
      </div>

      {paletteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
          onMouseDown={() => setPaletteOpen(false)}
        >
          <div
            className="tenant-card"
            style={{ width: 'min(520px, 94vw)', padding: 0, overflow: 'hidden' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 12, borderBottom: '1px solid rgba(148,163,184,0.35)' }}>
              <input
                autoFocus
                className="neo-input"
                placeholder="Jump to module…"
                value={paletteQ}
                onChange={(e) => setPaletteQ(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 8, maxHeight: 320, overflow: 'auto' }}>
              {paletteHits.map((h) => (
                <li key={h.to}>
                  <button
                    type="button"
                    onClick={() => goPalette(h.to)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <strong>{h.label}</strong>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{h.to}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};
