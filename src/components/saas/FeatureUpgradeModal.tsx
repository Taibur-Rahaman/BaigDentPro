import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  open: boolean;
  featureLabel: string;
  onClose: () => void;
};

export const FeatureUpgradeModal: React.FC<Props> = ({ open, featureLabel, onClose }) => {
  if (!open) return null;
  return (
    <div className="feature-upgrade-overlay" role="dialog" aria-modal="true">
      <div className="feature-upgrade-card">
        <h2>{featureLabel}</h2>
        <p>This capability is gated by your subscription tier. Upgrade to unlock enterprise scheduling, analytics, and more.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard/plans" className="neo-btn neo-btn-primary" style={{ textDecoration: 'none' }} onClick={onClose}>
            Compare plans
          </Link>
          <button type="button" className="neo-btn neo-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
