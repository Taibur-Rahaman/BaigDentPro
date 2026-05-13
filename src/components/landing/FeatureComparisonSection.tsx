import React from 'react';

const ROWS: { feature: string; starter: boolean; growth: boolean; enterprise: boolean }[] = [
  { feature: 'Core scheduling & patient profiles', starter: true, growth: true, enterprise: true },
  { feature: 'Digital prescriptions & exports', starter: true, growth: true, enterprise: true },
  { feature: 'Multi-user coordination', starter: false, growth: true, enterprise: true },
  { feature: 'Operational logs & analytics depth', starter: false, growth: true, enterprise: true },
  { feature: 'Governance & advanced controls', starter: false, growth: false, enterprise: true },
];

function Cell({ ok }: { ok: boolean }) {
  return (
    <td className="bdp-compare__cell">
      {ok ? (
        <>
          <i className="fa-solid fa-check bdp-compare__yes" aria-hidden />
          <span className="bdp-sr-only">Included</span>
        </>
      ) : (
        <>
          <span className="bdp-compare__dash" aria-hidden>
            —
          </span>
          <span className="bdp-sr-only">Not included</span>
        </>
      )}
    </td>
  );
}

export const FeatureComparisonSection: React.FC = () => (
  <section id="compare" className="bdp-section bdp-compare" aria-labelledby="compare-heading">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-table" aria-hidden />
          <span>Compare</span>
        </div>
        <h2 id="compare-heading" className="bdp-h2">
          Plans at a glance
        </h2>
        <p className="bdp-subtitle">High-signal differences across Starter, Growth, and Enterprise-grade governance.</p>
      </header>
      <div className="bdp-compare__wrap">
        <table className="bdp-compare__table">
          <caption className="bdp-sr-only">Feature comparison across BaigDentPro plans</caption>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">Starter</th>
              <th scope="col">Growth</th>
              <th scope="col">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <Cell ok={row.starter} />
                <Cell ok={row.growth} />
                <Cell ok={row.enterprise} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);
