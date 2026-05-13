import React from 'react';

export interface LandingThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
}

export const LandingThemeToggle: React.FC<LandingThemeToggleProps> = ({ dark, onToggle }) => (
  <button
    type="button"
    className="bdp-theme-toggle"
    onClick={onToggle}
    aria-pressed={dark}
    aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    <span className="bdp-theme-toggle__icon" aria-hidden>
      {dark ? <i className="fa-solid fa-sun" /> : <i className="fa-solid fa-moon" />}
    </span>
    <span className="bdp-sr-only">{dark ? 'Light mode' : 'Dark mode'}</span>
  </button>
);
