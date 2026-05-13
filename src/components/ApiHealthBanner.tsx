import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSafeHealthProbe } from '@/hooks/useSafeHealthProbe';

/**
 * In-app `/api/health` probe (via {@link useSafeHealthProbe}).
 * Renders only under `AuthenticatedLayout`; unmount clears probe state.
 */
export const ApiHealthBanner: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const { failed, isLoading } = useSafeHealthProbe({
    enabled: isAuthenticated,
    pathname: location.pathname,
    debounceMs: 175,
    deferUntilPaint: true,
  });

  useEffect(() => {
    console.log('[HEALTH BANNER RENDER]', {
      pathname: location.pathname,
      failed,
      isLoading,
      isAuthenticated,
    });
  }, [failed, isLoading, isAuthenticated, location.pathname]);

  if (!isAuthenticated) return null;
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
      API unreachable (health check). Contact support if problems continue.
    </div>
  );
};
