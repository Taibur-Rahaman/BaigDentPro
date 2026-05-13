import React from 'react';

export const SeoSolutionsSection: React.FC = () => (
  <section id="solutions-seo" className="bdp-section bdp-seo-solutions">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-globe" aria-hidden />
          <span>Solutions</span>
        </div>
        <h2 className="bdp-h2">Dental operations software built for Bangladesh clinics</h2>
        <p className="bdp-subtitle">
          Whether you search for <strong>dental software Bangladesh</strong>, <strong>dental clinic management software</strong>, or a practical{' '}
          <strong>dental ERP Bangladesh</strong> alternative to spreadsheets, BaigDentPro aligns scheduling, clinical documentation, and revenue workflows in one
          professional surface.
        </p>
      </header>
      <div className="bdp-seo-solutions__grid">
        <article className="bdp-seo-card">
          <h3 className="bdp-seo-card__title">Dental prescription software</h3>
          <p>
            Structured prescribing with consistent formats supports compliance and patient confidence. Export and share prescriptions without rebuilding templates in
            Word for every visit.
          </p>
        </article>
        <article className="bdp-seo-card">
          <h3 className="bdp-seo-card__title">Dental billing software</h3>
          <p>
            Clear invoices, payments, and balances reduce friction at the front desk. Finance stays aligned with clinical activity instead of reconciling shadow spreadsheets.
          </p>
        </article>
        <article className="bdp-seo-card">
          <h3 className="bdp-seo-card__title">Clinic management system</h3>
          <p>
            Operatory schedules, patient records, lab follow-up, and staff roles stay coordinated. Scale from a single chair to multiple branches without swapping platforms.
          </p>
        </article>
      </div>
    </div>
  </section>
);
