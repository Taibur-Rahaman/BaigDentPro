import React, { useCallback, useEffect, useId, useState } from 'react';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';
import { LandingThemeToggle } from '@/components/landing/LandingThemeToggle';

export interface LandingHeaderProps {
  siteLogo: string;
  cartItemCount: number;
  scrolled: boolean;
  onCartClick: () => void;
  onRequestTrialWhatsApp?: () => void;
  onLoginClick: () => void;
  onPortalClick?: () => void;
  onApiTestClick?: () => void;
  themeDark: boolean;
  onToggleTheme: () => void;
}

const NAV: { href: string; label: string }[] = [
  { href: '#hero', label: 'Home' },
  { href: '#platform', label: 'Platform' },
  { href: '#shop', label: 'Shop' },
  { href: '#compare', label: 'Compare' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  siteLogo,
  cartItemCount,
  scrolled,
  onCartClick,
  onRequestTrialWhatsApp,
  onLoginClick,
  onPortalClick,
  onApiTestClick,
  themeDark,
  onToggleTheme,
}) => {
  const menuId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, closeMobile]);

  return (
    <header className={`bdp-header${scrolled ? ' bdp-header--scrolled' : ''}`}>
      <div className="bdp-header__inner">
        <a href="#hero" className="bdp-header__logo">
          <img src={siteLogo} alt="BaigDentPro" width={160} height={40} decoding="async" />
        </a>

        <nav className="bdp-nav bdp-nav--desktop" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="bdp-nav__link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="bdp-header__actions">
          <LandingThemeToggle dark={themeDark} onToggle={onToggleTheme} />
          {onApiTestClick && (
            <button type="button" className="bdp-btn bdp-btn--ghost bdp-btn--sm bdp-hide-mobile" onClick={onApiTestClick} title="Catalog API">
              <i className="fa-solid fa-plug" aria-hidden />
              <span>API</span>
            </button>
          )}
          <button type="button" className="bdp-cart" onClick={onCartClick} aria-label={`Open cart${cartItemCount ? `, ${cartItemCount} items` : ''}`}>
            <i className="fa-solid fa-cart-shopping" aria-hidden />
            {cartItemCount > 0 && <span className="bdp-cart__badge">{cartItemCount}</span>}
          </button>
          {onPortalClick && (
            <button type="button" className="bdp-btn bdp-btn--secondary bdp-btn--sm bdp-hide-mobile" onClick={onPortalClick}>
              <i className="fa-solid fa-hospital" aria-hidden />
              <span>Clinic portal</span>
            </button>
          )}
          {onRequestTrialWhatsApp && (
            <span className="bdp-hide-mobile">
              <RequestTrialWhatsAppButton density="header" size="sm" onClick={onRequestTrialWhatsApp} />
            </span>
          )}
          <button type="button" className="bdp-btn bdp-btn--secondary bdp-btn--sm bdp-hide-mobile" onClick={onLoginClick}>
            <i className="fa-solid fa-user-doctor" aria-hidden />
            <span>Dentist Portal</span>
          </button>

          <button
            type="button"
            className="bdp-menu-btn"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="bdp-sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden />
          </button>
        </div>
      </div>

      <div id={menuId} className={`bdp-drawer${mobileOpen ? ' bdp-drawer--open' : ''}`} role="dialog" aria-modal="true" aria-label="Site navigation">
        <div className="bdp-drawer__backdrop" onClick={closeMobile} aria-hidden />
        <div className="bdp-drawer__panel">
          <nav className="bdp-drawer__nav" aria-label="Mobile primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="bdp-drawer__link" onClick={closeMobile}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="bdp-drawer__actions">
            {onRequestTrialWhatsApp && <RequestTrialWhatsAppButton size="sm" onClick={() => { closeMobile(); onRequestTrialWhatsApp(); }} />}
            <button type="button" className="bdp-btn bdp-btn--secondary bdp-btn--block" onClick={() => { closeMobile(); onLoginClick(); }}>
              Dentist Portal
            </button>
            {onPortalClick && (
              <button type="button" className="bdp-btn bdp-btn--ghost bdp-btn--block" onClick={() => { closeMobile(); onPortalClick(); }}>
                Clinic portal
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
