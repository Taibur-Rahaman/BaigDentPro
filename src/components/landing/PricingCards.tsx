import React from 'react';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
}

export interface PricingCardsProps {
  onChoosePlan: (plan: PricingPlan) => void;
}

export const PricingCards: React.FC<PricingCardsProps> = ({ onChoosePlan }) => (
  <section id="pricing" className="bdp-section bdp-pricing">
    <div className="bdp-section__inner">
      <header className="bdp-section__header bdp-pricing__intro">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-tags" aria-hidden />
          <span>Monthly · BDT · cancel anytime</span>
        </div>
        <h2 className="bdp-h2">Pricing engineered for upgrade momentum</h2>
        <p className="bdp-subtitle">
          Start affordably with Starter, scale operational depth on Growth, and unlock enterprise governance when multiple locations or compliance scrutiny demands it.
          Every tier keeps patient records, encrypted backup posture, and digital prescription tooling aligned with serious <strong>DPMS software in Bangladesh</strong>.
        </p>
      </header>

      <div className="bdp-price-cards">
        <article className="bdp-price-card">
          <h3 className="bdp-price-card__name">Starter: Entry · Low Friction</h3>
          <div className="bdp-price-card__amount">
            <span className="bdp-price-card__currency">৳300</span>
            <span className="bdp-price-card__period">/month</span>
          </div>
          <p className="bdp-price-card__desc">For solo dentists & compact teams</p>
          <button type="button" className="bdp-btn bdp-btn--secondary bdp-btn--block" onClick={() => onChoosePlan({ id: 'PLAN_STARTER', name: 'Starter', price: 300 })}>
            Start on Starter
          </button>
          <ul className="bdp-price-card__features">
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Core calendar & patient profiles
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Digital prescriptions & PDF exports
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Essential billing visibility
            </li>
          </ul>
        </article>

        <article className="bdp-price-card bdp-price-card--featured">
          <div className="bdp-price-card__ribbon">Best value</div>
          <h3 className="bdp-price-card__name">Growth: Most Clinics Choose This</h3>
          <div className="bdp-price-card__amount">
            <span className="bdp-price-card__currency">৳700</span>
            <span className="bdp-price-card__period">/month</span>
          </div>
          <button type="button" className="bdp-btn bdp-btn--primary bdp-btn--block" onClick={() => onChoosePlan({ id: 'PLAN_GROWTH', name: 'Growth', price: 700 })}>
            Choose Growth
          </button>
          <ul className="bdp-price-card__features">
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Everything in Starter
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Multi-user coordination
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Operational logs & analytics
            </li>
          </ul>
        </article>

        <article className="bdp-price-card bdp-price-card--enterprise">
          <h3 className="bdp-price-card__name">Enterprise: Scale Without Limits</h3>
          <div className="bdp-price-card__amount">
            <span className="bdp-price-card__currency">৳5000</span>
            <span className="bdp-price-card__period">/month</span>
          </div>
          <button
            type="button"
            className="bdp-btn bdp-btn--secondary bdp-btn--block"
            onClick={() => onChoosePlan({ id: 'PLAN_ENTERPRISE', name: 'Enterprise', price: 5000 })}
          >
            Continue to Checkout
          </button>
          <ul className="bdp-price-card__features">
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Everything in Growth
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Multi-branch governance
            </li>
            <li>
              <i className="fa-solid fa-check" aria-hidden />
              Priority support
            </li>
          </ul>
        </article>
      </div>

      <div className="bdp-pricing__footnote">
        <p>
          Questions about mapping your current seats, branches, or compliance needs?{' '}
          <a href="https://wa.me/8801601677122" target="_blank" rel="noopener noreferrer">
            Message us on WhatsApp
          </a>{' '}
          after you start a trial; we respond fast during BD business hours.
        </p>
      </div>
    </div>
  </section>
);
