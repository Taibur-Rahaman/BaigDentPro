import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

function readLoginRedirectState(raw: unknown): { from: string; flash: string | undefined } {
  if (!raw || typeof raw !== 'object') {
    return { from: '/dashboard', flash: undefined };
  }
  const from =
    'from' in raw && typeof raw.from === 'string' && raw.from.length > 0 ? raw.from : '/dashboard';
  const flash =
    'message' in raw && typeof raw.message === 'string' ? raw.message : undefined;
  return { from, flash };
}

/** Typed read of `location.state` for post-login redirect (no casts in UI). */
export function useLoginLocationState(): { from: string; flash: string | undefined } {
  const location = useLocation();
  return useMemo(() => readLoginRedirectState(location.state), [location.state]);
}
