import React from 'react';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';

export type CTASectionVariant = 'fomo' | 'mid';

export interface CTASectionProps {
  variant: CTASectionVariant;
  onRequestTrialWhatsApp: () => void;
  onLoginClick?: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ variant, onRequestTrialWhatsApp, onLoginClick }) => {
  if (variant === 'fomo') {
    return (
      <section className="bdp-cta bdp-cta--fomo" aria-labelledby="bdp-fomo-title">
        <div className="bdp-cta__inner">
          <div>
            <h2 id="bdp-fomo-title" className="bdp-cta__title">
              Clinics are switching to digital systems: early movers compound advantages
            </h2>
            <p className="bdp-cta__text">
              Patients compare experiences online. Teams compete for talent. Finance asks harder questions. Practices that centralize scheduling, billing, lab work,
              and <strong>digital prescriptions</strong> on one DPMS respond faster, while others reconcile chaos across paper and disconnected apps.
            </p>
          </div>
          <div className="bdp-cta__aside">
            <p className="bdp-cta__aside-label">Limited onboarding windows each month</p>
            <RequestTrialWhatsAppButton size="block" onClick={onRequestTrialWhatsApp} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bdp-cta bdp-cta--mid" aria-labelledby="bdp-mid-title">
      <div className="bdp-section__inner">
        <div className="bdp-cta__inner">
          <div>
            <h2 id="bdp-mid-title" className="bdp-cta__title">
              Ready to run your clinic like a modern SaaS organization?
            </h2>
            <p className="bdp-cta__text">
              Reach us on WhatsApp with one tap, same flow as the homepage. Keep Shop checkout separate, or fold retail into how patients already trust your brand.
            </p>
          </div>
          <div className="bdp-cta__actions">
            <RequestTrialWhatsAppButton size="lg" onClick={onRequestTrialWhatsApp} />
            {onLoginClick && (
              <button type="button" className="bdp-btn bdp-btn--secondary bdp-btn--lg" onClick={onLoginClick}>
                Dentist sign-in
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
