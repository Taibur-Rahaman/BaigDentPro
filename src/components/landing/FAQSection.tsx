import React, { useId, useState } from 'react';

const ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is BaigDentPro suitable for a single-chair clinic?',
    a: 'Yes. You can start on a light plan and add users, branches, and workflows as you grow. The product is designed for both independent practices and multi-location groups.',
  },
  {
    q: 'How does onboarding and support work?',
    a: 'We offer guided setup over WhatsApp and email, with clear checklists for data entry, staff roles, and go-live. Enterprise customers can request structured training sessions.',
  },
  {
    q: 'Can we use digital prescriptions and patient communication?',
    a: 'BaigDentPro includes prescription flows and export options so your team can document care consistently. Communication features depend on your plan and approved integrations.',
  },
  {
    q: 'Is my patient data secure?',
    a: 'The platform is built for professional healthcare operations: access controls, audit-friendly activity, and transport security in line with common SaaS practice. Your team defines who sees what inside the clinic.',
  },
  {
    q: 'Do you replace my accounting system?',
    a: 'BaigDentPro focuses on clinic operations, billing visibility, and patient ledger workflows. For full general ledger accounting, many clinics still pair with their accountant or ERP — we keep clinical and billing workflows coherent inside BaigDentPro.',
  },
];

export const FAQSection: React.FC = () => {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bdp-section bdp-faq" aria-labelledby={`${baseId}-faq-title`}>
      <div className="bdp-section__inner">
        <header className="bdp-section__header">
          <div className="bdp-eyebrow">
            <i className="fa-solid fa-circle-question" aria-hidden />
            <span>FAQ</span>
          </div>
          <h2 id={`${baseId}-faq-title`} className="bdp-h2">
            Answers before you book a demo
          </h2>
          <p className="bdp-subtitle">
            Straightforward information for clinic owners evaluating <strong>dental clinic management software</strong> in Bangladesh.
          </p>
        </header>
        <div className="bdp-faq__list">
          {ITEMS.map((item, i) => {
            const panelId = `${baseId}-panel-${i}`;
            const btnId = `${baseId}-btn-${i}`;
            const expanded = open === i;
            return (
              <div key={item.q} className="bdp-faq__item">
                <h3 className="bdp-faq__question">
                  <button
                    id={btnId}
                    type="button"
                    className="bdp-faq__trigger"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : i)}
                  >
                    <span>{item.q}</span>
                    <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} aria-hidden />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={`bdp-faq__panel${expanded ? '' : ' bdp-faq__panel--collapsed'}`}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
