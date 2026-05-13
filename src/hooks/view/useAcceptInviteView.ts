import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/api';

export type InvitePreviewVM = Pick<
  Awaited<ReturnType<typeof api.invite.preview>>,
  'clinicName' | 'emailMasked' | 'role'
>;

/** Load invite preview and accept flow for `/accept-invite`. */
export function useAcceptInviteView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token')?.trim() ?? '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<InvitePreviewVM | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invite token.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.invite.preview(token);
        if (!cancelled)
          setPreview({
            clinicName: res.clinicName,
            emailMasked: res.emailMasked,
            role: res.role,
          });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Invite could not be loaded.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!token) return;
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      setBusy(true);
      try {
        await api.invite.accept({ token, name: name.trim(), password });
        navigate('/login', { replace: true, state: { message: 'Account created. Sign in with your email and password.' } });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not accept invite');
      } finally {
        setBusy(false);
      }
    },
    [name, navigate, password, token],
  );

  return {
    token,
    name,
    setName,
    password,
    setPassword,
    preview,
    error,
    busy,
    submit,
  };
}
