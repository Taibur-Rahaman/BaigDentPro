import { useCallback, useEffect, useState } from 'react';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { userService, type MeUser } from '@/services/userService';

export function useCurrentUser() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await userService.me();
      setUser(res);
      if (!res) {
        setError('Not signed in.');
      }
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
