import React from 'react';

const ITEMS = [
  {
    icon: 'fa-shield-check',
    brand: false,
    title: 'Encryption-first infrastructure',
    body:
      'Protect PHI with modern encryption and disciplined access patterns, built for teams scrutinizing every vendor when they adopt new dental software.',
  },
  {
    icon: 'fa-whatsapp',
    brand: true,
    title: 'WhatsApp-ready communications',
    body: 'Automated reminders and rich updates patients actually read, meeting expectations for clinics across Dhaka and Bangladesh.',
  },
  {
    icon: 'fa-file-pdf',
    brand: false,
    title: 'Instant professional documents',
    body: 'Prescriptions and invoices rendered as polished PDFs, reflecting the standard patients expect from leading DPMS software.',
  },
  {
    icon: 'fa-chart-line',
    brand: false,
    title: 'Leadership-grade analytics',
    body: 'See appointment throughput, revenue signals, and growth without exporting fragile spreadsheets from your clinic management system.',
  },
] as const;

export const WhySection: React.FC = () => (
  <section id="why" className="bdp-section">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-gem" aria-hidden />
          <span>Operational resilience</span>
        </div>
        <h2 className="bdp-h2">
          Why clinics choose <span className="bdp-gradient">BaigDentPro</span>
        </h2>
        <p className="bdp-subtitle">
          Move faster than generic clinic tools: purpose-built workflows for dentistry, finance visibility for owners, and calm experiences for patients.
        </p>
      </header>
      <div className="bdp-why__grid">
        {ITEMS.map((item) => (
          <article key={item.title} className="bdp-why-card">
            <div className="bdp-why-card__icon">
              <i className={item.brand ? `fa-brands ${item.icon}` : `fa-solid ${item.icon}`} aria-hidden />
            </div>
            <h3 className="bdp-why-card__title">{item.title}</h3>
            <p className="bdp-why-card__body">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
