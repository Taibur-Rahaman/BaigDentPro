import React from 'react';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';

export interface StickyMobileCtaProps {
  onRequestTrialWhatsApp: () => void;
}

export const StickyMobileCta: React.FC<StickyMobileCtaProps> = ({ onRequestTrialWhatsApp }) => (
  <div className="bdp-sticky-cta" role="region" aria-label="Quick actions on mobile">
    <RequestTrialWhatsAppButton size="sm" onClick={onRequestTrialWhatsApp} />
    <a href="#book-demo" className="bdp-btn bdp-btn--secondary bdp-btn--sm">
      Book demo
    </a>
    <a href="#pricing" className="bdp-btn bdp-btn--ghost bdp-btn--sm">
      Pricing
    </a>
  </div>
);
