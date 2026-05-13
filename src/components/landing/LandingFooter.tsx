import React from 'react';
import { Link } from 'react-router-dom';
import { REQUEST_TRIAL_CTA_LABEL } from '@/components/landing/RequestTrialWhatsAppButton';

export interface LandingFooterProps {
  siteLogo: string;
  onRequestTrialWhatsApp?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ siteLogo, onRequestTrialWhatsApp }) => (
  <footer className="bdp-footer">
    <div className="bdp-footer__grid">
      <div className="bdp-footer__brand">
        <img src={siteLogo} alt="BaigDentPro" width={160} height={40} className="bdp-footer__logo" />
        <p>
          Hospital-grade <strong>dental software for Bangladesh</strong>: DPMS, billing, and patient experiences in one product surface.
        </p>
      </div>
      <div className="bdp-footer__cols">
        <div>
          <p className="bdp-footer__col-title">Product</p>
          {onRequestTrialWhatsApp ? (
            <button type="button" className="bdp-footer__link" onClick={onRequestTrialWhatsApp}>
              {REQUEST_TRIAL_CTA_LABEL}
            </button>
          ) : (
            <Link to="/signup" className="bdp-footer__link">
              Sign up
            </Link>
          )}
          <a href="#pricing" className="bdp-footer__link">
            Pricing
          </a>
          <a href="#platform" className="bdp-footer__link">
            Platform overview
          </a>
        </div>
        <div>
          <p className="bdp-footer__col-title">Portals</p>
          <Link to="/portal/login" className="bdp-footer__link">
            Patient portal
          </Link>
          <Link to="/staff-portal" className="bdp-footer__link">
            Clinic portal (staff)
          </Link>
          <Link to="/login" className="bdp-footer__link">
            Dentist portal
          </Link>
        </div>
        <div>
          <p className="bdp-footer__col-title">Contact</p>
          <a href="https://wa.me/8801601677122" target="_blank" rel="noopener noreferrer" className="bdp-footer__link">
            WhatsApp
          </a>
          <a href="mailto:info@baigdentpro.com" className="bdp-footer__link">
            Email
          </a>
        </div>
      </div>
    </div>
    <div className="bdp-footer__bottom">
      <p>© 2026 BaigDentPro · Omix Solutions · All rights reserved</p>
    </div>
  </footer>
);
