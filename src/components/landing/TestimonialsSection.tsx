import React from 'react';

const QUOTES: { quote: string; role: string; city: string }[] = [
  {
    quote:
      'We replaced spreadsheets and paper trails with one calendar and chart flow. Front desk and doctors finally share the same truth.',
    role: 'Practice manager',
    city: 'Dhaka',
  },
  {
    quote:
      'Prescription PDFs look professional and consistent — patients notice. Billing visibility reduced disputes at checkout.',
    role: 'Lead dentist',
    city: 'Chattogram',
  },
  {
    quote:
      'Onboarding was practical: roles, branches, and basic workflows without forcing us into a generic hospital ERP.',
    role: 'Clinic owner',
    city: 'Sylhet',
  },
];

export const TestimonialsSection: React.FC = () => (
  <section id="testimonials" className="bdp-section bdp-testimonials">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-quote-left" aria-hidden />
          <span>Clinic voices</span>
        </div>
        <h2 className="bdp-h2">Teams trust BaigDentPro for daily operations</h2>
        <p className="bdp-subtitle">
          Representative feedback from practices modernizing with <strong>dental software Bangladesh</strong> teams rely on for scheduling and records.
        </p>
      </header>
      <div className="bdp-testimonials__grid">
        {QUOTES.map((t) => (
          <blockquote key={t.quote} className="bdp-testimonial-card">
            <p className="bdp-testimonial-card__quote">&ldquo;{t.quote}&rdquo;</p>
            <footer>
              <span className="bdp-testimonial-card__meta">
                {t.role} · {t.city}
              </span>
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  </section>
);
