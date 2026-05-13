import React from 'react';
import { useAISchedulingView } from '@/hooks/view/useAISchedulingView';

export const NetworkAnalyticsPage: React.FC = () => {
  const insight = useAISchedulingView({
    proposedStartIso: new Date().toISOString(),
    adjacentBusyStartsIso: [],
  });

  return (
    <div>
      <h1 className="pp-title">Network analytics</h1>
      <p className="pp-muted">Placeholder analytics plus scheduling AI stub.</p>
      <div className="pp-card">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Sample slot insight: <strong>{insight.efficiency}</strong> — {insight.suggestion}
        </p>
      </div>
    </div>
  );
};
