import React from 'react';

export const TrustSection: React.FC = () => (
  <section id="trust" className="bdp-section bdp-trust">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-handshake" aria-hidden />
          <span>Trust</span>
        </div>
        <h2 className="bdp-h2">Trusted dental software for clinics across Bangladesh</h2>
        <p className="bdp-trust__lead">
          From high-volume <strong>dental clinic software in Dhaka</strong> to growing single-chair practices, teams adopt BaigDentPro to modernize operations
          without compromising clinical focus.
        </p>
      </header>
      <div className="bdp-logo-row" aria-hidden>
        <span className="bdp-logo-pill">Dhaka</span>
        <span className="bdp-logo-pill">Chattogram</span>
        <span className="bdp-logo-pill">Sylhet</span>
        <span className="bdp-logo-pill">Nationwide</span>
      </div>
      <p className="bdp-trust__note">Independent practices and emerging dental groups standardize on one DPMS instead of juggling generic clinic tools.</p>
    </div>
  </section>
);
