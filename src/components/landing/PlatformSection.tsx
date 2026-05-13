import React from 'react';
import { RequestTrialWhatsAppButton } from '@/components/landing/RequestTrialWhatsAppButton';

export interface PlatformSectionProps {
  onRequestTrialWhatsApp: () => void;
}

const CARDS: Array<{
  icon: string;
  label: string;
  title: string;
  body: React.ReactNode;
  wide?: boolean;
}> = [
  {
    icon: 'fa-calendar-days',
    label: 'Scheduling',
    title: 'Chair time that stays under control',
    body: (
      <>
        Live calendar views by operatory, reminders patients actually see, and fewer empty slots, without the constant phone tag between desk and surgery.
      </>
    ),
  },
  {
    icon: 'fa-users',
    label: 'Patients',
    title: 'Records your whole team can trust',
    body: (
      <>
        One chart, clear visit history, and messages that match how your clinic works, so handoffs between reception and clinician stay smooth.
      </>
    ),
  },
  {
    icon: 'fa-scale-balanced',
    label: 'Finance',
    title: 'Balances leaders can read',
    body: (
      <>
        What patients owe, plan instalments, and day-to-day collections, visible at the front desk and summarized for owners, with less spreadsheet drift.
      </>
    ),
  },
  {
    icon: 'fa-microscope',
    label: 'Lab',
    title: 'Cases from order to delivery',
    body: (
      <>
        Track crown, bridge, and removable work with statuses your team agrees on: fewer “where is my case?” calls and more predictable chair time.
      </>
    ),
  },
  {
    icon: 'fa-file-prescription',
    label: 'Prescriptions',
    title: 'Digital Rx aligned with Bangladesh practice',
    body: (
      <>
        Print-ready prescriptions with your branding, built for how regulators and patients expect professional documentation in-country.
      </>
    ),
    wide: true,
  },
  {
    icon: 'fa-bag-shopping',
    label: 'Retail',
    title: 'Shop beside clinical work',
    body: (
      <>
        Offer consumables and patient-friendly products through the same platform, retail that lives next to treatment, not in a separate silo.
      </>
    ),
    wide: true,
  },
];

export const PlatformSection: React.FC<PlatformSectionProps> = ({ onRequestTrialWhatsApp }) => (
  <section id="platform" className="bdp-section bdp-platform">
    <div className="bdp-section__inner">
      <header className="bdp-section__header bdp-platform__intro">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-layer-group" aria-hidden />
          <span>Platform</span>
        </div>
        <h2 className="bdp-h2">
          Clinical operations and clinic revenue, <span className="bdp-gradient">in one place</span>
        </h2>
        <p className="bdp-subtitle">
          Built for <strong>dental software in Bangladesh</strong>: front desk, clinicians, and finance on one workspace, without duct-taping generic clinic tools.
        </p>
      </header>

      <div className="bdp-platform__grid">
        {CARDS.map((c, i) => (
          <article
            key={c.label}
            className={`bdp-pcard bdp-pcard--reveal${c.wide ? ' bdp-pcard--wide' : ''}`}
            style={{ '--stagger': i } as React.CSSProperties}
          >
            <span className="bdp-pcard__label">{c.label}</span>
            <h3 className="bdp-pcard__title">
              <span className="bdp-pcard__icon-wrap" aria-hidden>
                <i className={`fa-solid ${c.icon}`} />
              </span>
              {c.title}
            </h3>
            <p className="bdp-pcard__body">{c.body}</p>
          </article>
        ))}
      </div>

      <div className="bdp-platform__cta">
        <RequestTrialWhatsAppButton size="lg" onClick={onRequestTrialWhatsApp} />
        <a href="#pricing" className="bdp-btn bdp-btn--secondary bdp-btn--lg">
          Compare plans (BDT)
        </a>
      </div>
    </div>
  </section>
);
