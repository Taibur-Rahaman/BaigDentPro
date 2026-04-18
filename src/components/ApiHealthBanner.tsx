import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/apiClient';

/**
 * Optional probe: if `/api/health` fails, show a support banner (wrong host, API down, etc.).
 */
export const ApiHealthBanner: React.FC = () => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await apiRequest('/api/health');
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!failed) return null;

  return (
    <div
      role="alert"
      style={{
        padding: '0.65rem 1rem',
        textAlign: 'center',
        fontSize: '0.95rem',
        background: 'rgba(185, 28, 28, 0.15)',
        color: '#fecaca',
        borderBottom: '1px solid rgba(248, 113, 113, 0.35)',
      }}
    >
      API connection failed. Please contact support.
    </div>
  );
};
