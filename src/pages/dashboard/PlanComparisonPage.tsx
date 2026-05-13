import React from 'react';
import { Link } from 'react-router-dom';
import { useTenantPlanView } from '@/hooks/view/useTenantPlanView';

export const PlanComparisonPage: React.FC = () => {
  const { plans, orderedTiers } = useTenantPlanView();
  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Plans</h1>
        <p className="tenant-page-lead">FREE · PRO · ENTERPRISE — feature matrix from coreTenantPlan definitions.</p>
        <Link to="/dashboard/subscription" className="neo-btn neo-btn-secondary" style={{ textDecoration: 'none' }}>
          Subscription &amp; WhatsApp checkout
        </Link>
      </div>
      <div className="plan-compare-grid">
        {orderedTiers.map((tier) => {
          const def = plans[tier];
          return (
            <div key={tier} className={`plan-card plan-card--${tier.toLowerCase()}`}>
              <h2>{def.title}</h2>
              <p>{def.description}</p>
              <ul>
                {def.features.map((f) => (
                  <li key={f}>
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
