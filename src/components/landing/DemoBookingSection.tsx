import React from 'react';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';

export interface DemoBookingSectionProps {
  onRequestTrialWhatsApp: () => void;
}

export const DemoBookingSection: React.FC<DemoBookingSectionProps> = ({ onRequestTrialWhatsApp }) => (
  <section id="book-demo" className="bdp-section bdp-demo-band">
    <div className="bdp-section__inner">
      <div className="bdp-demo-band__card">
        <div className="bdp-demo-band__copy">
          <h2 className="bdp-h2 bdp-demo-band__title">Book a live walkthrough</h2>
          <p className="bdp-subtitle">
            See scheduling, records, billing, and prescriptions in one flow. Share your clinic context — we&apos;ll tailor the conversation to your team size and locations.
          </p>
        </div>
        <div className="bdp-demo-band__cta">
          <RequestTrialWhatsAppButton size="lg" onClick={onRequestTrialWhatsApp} />
        </div>
      </div>
    </div>
  </section>
);
