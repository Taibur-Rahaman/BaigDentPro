import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/api';
import { loginErrorMessageForUser } from '@/lib/apiErrors';
import { postAuthDashboardPath } from '@/lib/postAuthDashboardPath';
import { getSpaOrigin } from '@/lib/spaOrigin';
import { getSupabase } from '@/lib/supabaseClient';
import type { AppUser } from '@/types/appUser';
import { useAuth } from '@/hooks/useAuth';

export type PortalRegisterForm = {
  email: string;
  password: string;
  name: string;
  clinicName: string;
  phone: string;
  title: string;
  degree: string;
};

/** Orchestration for legacy clinic registration, Prisma login, Supabase-driven password reset (`/staff-portal`). */
export function usePortalAuthView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession, login, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerInfo, setRegisterInfo] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState<PortalRegisterForm>({
    email: '',
    password: '',
    name: '',
    clinicName: '',
    phone: '',
    title: '',
    degree: '',
  });
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSentMessage, setForgotSentMessage] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');

  const recoveryHandled = useRef(false);
  useEffect(() => {
    const st = location.state as { recovery?: boolean } | null;
    if (!st?.recovery || recoveryHandled.current) return;
    recoveryHandled.current = true;
    setIsRegister(false);
    setForgotPasswordMode(false);
    setForgotSentMessage('');
    setRecoveryMode(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!token?.trim()) return;
    void (async () => {
      try {
        await refreshSession();
        const me = await api.auth.me();
        navigate(postAuthDashboardPath(me ?? undefined), { replace: true });
      } catch {
        try {
          await api.auth.logout();
        } catch {
          /* ignore */
        }
      }
    })();
  }, [navigate, refreshSession, token]);

  const handleLogin = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      setRegisterInfo('');
      setIsLoading(true);

      const form = e.currentTarget;
      const email = (form.querySelector('input[name="email"]') as HTMLInputElement)?.value?.trim();
      const password = (form.querySelector('input[name="password"]') as HTMLInputElement)?.value;

      if (!email || !password) {
        setError('Email and password are required');
        setIsLoading(false);
        return;
      }

      try {
        const signedIn = await login(email, password);
        await refreshSession();
        navigate(postAuthDashboardPath(signedIn as Pick<AppUser, 'role'> | null), { replace: true });
      } catch (err: unknown) {
        setError(loginErrorMessageForUser(err));
      } finally {
        setIsLoading(false);
      }
    },
    [login, navigate, refreshSession],
  );

  const handleForgotPassword = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setForgotSentMessage('');
    const sb = getSupabase();
    if (!sb) {
      setError('Password reset requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setIsLoading(true);
    try {
      const redirectTo = `${getSpaOrigin()}${window.location.pathname || '/'}`;
      const { error: sbErr } = await sb.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo });
      if (sbErr) throw new Error(sbErr.message);
      setForgotSentMessage('If an account exists for that email, you will receive a reset link shortly.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setIsLoading(false);
    }
  }, [forgotEmail]);

  const handleRecoveryPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      if (recoveryPassword !== recoveryPasswordConfirm) {
        setError('Passwords do not match');
        return;
      }
      const sb = getSupabase();
      if (!sb) {
        setError('Session lost. Open the reset link from your email again.');
        return;
      }
      setIsLoading(true);
      try {
        const { error: upErr } = await sb.auth.updateUser({ password: recoveryPassword });
        if (upErr) throw new Error(upErr.message);
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session?.access_token) throw new Error('Session expired. Open the reset link again.');
        const emailAfter = session.user?.email?.trim();
        if (!emailAfter) throw new Error('Email missing from session.');
        await api.auth.syncPrismaPassword(session.access_token, recoveryPassword);
        await sb.auth.signOut();
        try {
          const result = await api.auth.login(emailAfter, recoveryPassword);
          api.session.setUserSnapshotJson(JSON.stringify(result.user));
          setRecoveryMode(false);
          setRecoveryPassword('');
          setRecoveryPasswordConfirm('');
          await refreshSession();
          navigate(postAuthDashboardPath(result.user as Pick<AppUser, 'role'>), { replace: true });
        } catch (loginErr: unknown) {
          setError(loginErrorMessageForUser(loginErr));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not update password');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, recoveryPassword, recoveryPasswordConfirm, refreshSession],
  );

  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        const result = await api.auth.register(registerData);
        if (result.pendingApproval || !result.token) {
          setRegisterInfo(
            result.message ||
              'Your account was created and is pending approval by a platform administrator. You cannot sign in until it is approved.',
          );
          setError('');
          setIsRegister(false);
          setRegisterData({
            email: '',
            password: '',
            name: '',
            clinicName: '',
            phone: '',
            title: '',
            degree: '',
          });
          return;
        }
        api.session.setUserSnapshotJson(JSON.stringify(result.user));
        setRegisterInfo('');
        await refreshSession();
        navigate(postAuthDashboardPath(result.user as Pick<AppUser, 'role'>), { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, refreshSession, registerData],
  );

  return {
    navigate,
    isLoading,
    error,
    setError,
    registerInfo,
    setRegisterInfo,
    isRegister,
    setIsRegister,
    registerData,
    setRegisterData,
    forgotPasswordMode,
    setForgotPasswordMode,
    recoveryMode,
    setRecoveryMode,
    forgotEmail,
    setForgotEmail,
    forgotSentMessage,
    setForgotSentMessage,
    recoveryPassword,
    setRecoveryPassword,
    recoveryPasswordConfirm,
    setRecoveryPasswordConfirm,
    handleLogin,
    handleForgotPassword,
    handleRecoveryPassword,
    handleRegister,
  };
}
