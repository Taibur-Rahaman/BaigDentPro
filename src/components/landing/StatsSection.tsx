import React from 'react';

const STATS = [
  { value: '500+', label: 'Clinics on BaigDentPro' },
  { value: '50K+', label: 'Patients managed' },
  { value: '99.9%', label: 'Platform uptime' },
] as const;

export const StatsSection: React.FC = () => (
  <section className="bdp-section bdp-stats bdp-section--tight-top" aria-label="Key metrics">
    <div className="bdp-section__inner">
      <div className="bdp-stats__grid">
        {STATS.map((s) => (
          <div key={s.label} className="bdp-stat-card">
            <span className="bdp-stat-card__value">{s.value}</span>
            <span className="bdp-stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);
