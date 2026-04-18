import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { userService, type MeUser } from '@/services/userService';

function isMePayload(v: unknown): v is { success: boolean; user: MeUser } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const u = o.user;
  return (
    o.success === true &&
    u !== null &&
    typeof u === 'object' &&
    typeof (u as MeUser).id === 'string' &&
    typeof (u as MeUser).email === 'string'
  );
}

export function useCurrentUser() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await userService.me();
      if (!isMePayload(res)) {
        throw new Error('Unexpected response from server.');
      }
      setUser(res.user);
    } catch (e) {
      setUser(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { user, loading, error, reload, clearError: () => setError(null) };
}
