import React from 'react';
import { Link } from 'react-router-dom';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';

export interface HeroSectionProps {
  onRequestTrialWhatsApp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onRequestTrialWhatsApp }) => (
  <section id="hero" className="bdp-hero" aria-labelledby="hero-heading">
    <div className="bdp-hero__bg" aria-hidden />
    <div className="bdp-hero__layout">
      <div className="bdp-hero__copy">
        <div className="bdp-eyebrow bdp-hero__seq" style={{ '--seq': 0 } as React.CSSProperties}>
          <i className="fa-solid fa-shield-halved" aria-hidden />
          <span>Enterprise-grade DPMS · Bangladesh</span>
        </div>
        <h1 id="hero-heading" className="bdp-h1 bdp-hero__seq" style={{ '--seq': 1 } as React.CSSProperties}>
          Run your clinic on <span className="bdp-gradient">BaigDentPro</span> — modern dental practice software
        </h1>
        <p className="bdp-hero__lead bdp-hero__seq" style={{ '--seq': 2 } as React.CSSProperties}>
          One platform for scheduling, patient records, <strong>dental billing</strong>, lab coordination, and branded prescriptions — built for teams in Dhaka and nationwide,
          not generic clinic templates.
        </p>
        <div className="bdp-hero__cta bdp-hero__seq" style={{ '--seq': 3 } as React.CSSProperties}>
          <RequestTrialWhatsAppButton size="lg" onClick={onRequestTrialWhatsApp} />
          <Link to="/signup" className="bdp-btn bdp-btn--primary bdp-btn--lg">
            <i className="fa-solid fa-rocket" aria-hidden />
            Start free trial
          </Link>
          <a href="#book-demo" className="bdp-btn bdp-btn--secondary bdp-btn--lg">
            <i className="fa-solid fa-calendar-check" aria-hidden />
            Book demo
          </a>
          <a href="#pricing" className="bdp-btn bdp-btn--ghost bdp-btn--lg">
            <i className="fa-solid fa-tags" aria-hidden />
            View pricing
          </a>
        </div>
        <p className="bdp-hero__micro bdp-hero__seq" style={{ '--seq': 4 } as React.CSSProperties}>
          Prefer WhatsApp? Tap “Request a trial” — we reply with next steps. No spam; clinic-focused onboarding only.
        </p>
      </div>
      <div className="bdp-hero__visual bdp-hero__seq" style={{ '--seq': 2 } as React.CSSProperties} aria-hidden>
        <div className="bdp-dashboard-mock">
          <div className="bdp-dashboard-mock__chrome">
            <span className="bdp-dashboard-mock__dot" />
            <span className="bdp-dashboard-mock__dot" />
            <span className="bdp-dashboard-mock__dot" />
            <span className="bdp-dashboard-mock__title">BaigDentPro · Practice overview</span>
          </div>
          <div className="bdp-dashboard-mock__body">
            <aside className="bdp-dashboard-mock__rail">
              <span className="bdp-dashboard-mock__pill active" />
              <span className="bdp-dashboard-mock__pill" />
              <span className="bdp-dashboard-mock__pill" />
              <span className="bdp-dashboard-mock__pill" />
            </aside>
            <div className="bdp-dashboard-mock__main">
              <div className="bdp-dashboard-mock__kpi">
                <span />
                <span />
                <span />
              </div>
              <div className="bdp-dashboard-mock__chart">
                <span style={{ height: '42%' }} />
                <span style={{ height: '68%' }} />
                <span style={{ height: '55%' }} />
                <span style={{ height: '78%' }} />
                <span style={{ height: '62%' }} />
              </div>
              <div className="bdp-dashboard-mock__rows">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
        <p className="bdp-hero__visual-caption">Illustrative UI preview — not live patient data.</p>
      </div>
    </div>
  </section>
);
