import React from 'react';

const CAPABILITIES = [
  { icon: 'fa-calendar-check', title: 'Scheduling', desc: 'Calendars and reminders that fit real clinics' },
  { icon: 'fa-user-group', title: 'Patient management', desc: 'Charts, history & portal-ready care' },
  { icon: 'fa-file-invoice-dollar', title: 'Billing & AR', desc: 'Invoices, payments, visibility' },
  { icon: 'fa-file-prescription', title: 'Digital Rx', desc: 'Professional PDFs & audit trail' },
  { icon: 'fa-flask-vial', title: 'Lab tracking', desc: 'Crown, bridge & denture orders' },
  { icon: 'fa-store', title: 'Dental shop', desc: 'Retail channel built in' },
] as const;

export const FeaturesGrid: React.FC = () => (
  <section id="capabilities" className="bdp-section bdp-fgrid">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-table-cells-large" aria-hidden />
          <span>Capabilities</span>
        </div>
        <h2 className="bdp-h2">Everything your front desk and clinicians touch daily</h2>
        <p className="bdp-subtitle">
          Six pillars that keep Bangladeshi clinics moving, without turning your practice into an IT project.
        </p>
      </header>
      <div className="bdp-fgrid__items">
        {CAPABILITIES.map((c, i) => (
          <article key={c.title} className="bdp-fcard bdp-pcard--reveal" style={{ '--stagger': i } as React.CSSProperties}>
            <div className="bdp-fcard__icon">
              <i className={`fa-solid ${c.icon}`} aria-hidden />
            </div>
            <h3 className="bdp-fcard__title">{c.title}</h3>
            <p className="bdp-fcard__desc">{c.desc}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
