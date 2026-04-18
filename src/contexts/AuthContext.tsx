import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { getSupabase, isSupabaseAuthConfigured } from '@/lib/supabaseClient';
import { parseTenant, type TenantSummary } from '@/types/tenant';

export type { TenantSummary };

const APP_USER_KEY = 'baigdentpro:user';

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicId: string | null;
  phone?: string | null;
  clinicName?: string | null;
  isActive?: boolean;
  isApproved?: boolean;
  /** Effective clinic subscription (from `/api/auth/me`); server is source of truth. */
  tenant?: TenantSummary | null;
};

export type AuthLoginMode = 'supabase' | 'api';

export type AuthContextValue = {
  loading: boolean;
  /** API user from `/api/auth/me` or login payload (primary session for SaaS). */
  user: AppUser | null;
  /** Mirrors `localStorage['baigdentpro:token']` when set. */
  token: string | null;
  session: Session | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  login: (email: string, password: string, options?: { mode?: AuthLoginMode }) => Promise<void>;
  signup: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean; message?: string }>;
  registerSaasTenant: (input: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastBridge();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => api.getToken());

  const syncTokenFromStorage = useCallback(() => {
    setTokenState(api.getToken());
  }, []);

  const clearApiSession = useCallback(() => {
    api.setToken(null);
    localStorage.removeItem(APP_USER_KEY);
    localStorage.removeItem('baigdentpro:refreshToken');
    setUser(null);
    setTokenState(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      setSession(data.session ?? null);
    } else {
      setSession(null);
    }

    syncTokenFromStorage();
    const t = api.getToken();
    if (!t) {
      setUser(null);
      return;
    }

    try {
      const me = await api.auth.me();
      if (me && typeof me === 'object' && typeof me.id === 'string') {
        const raw = me as { tenant?: unknown };
        const next: AppUser = {
          id: me.id,
          email: me.email,
          name: me.name || '',
          role: me.role,
          clinicId: me.clinicId ?? null,
          phone: me.phone,
          clinicName: me.clinicName,
          isActive: me.isActive,
          isApproved: me.isApproved,
          tenant: parseTenant(raw.tenant),
        };
        setUser(next);
        localStorage.setItem(APP_USER_KEY, JSON.stringify(next));
      } else {
        clearApiSession();
      }
    } catch {
      clearApiSession();
    }
  }, [clearApiSession, syncTokenFromStorage]);

  const refreshSession = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      setSession(data.session ?? null);
    } else {
      setSession(null);
    }
    syncTokenFromStorage();
    const hadToken = Boolean(api.getToken());
    if (hadToken) {
      try {
        const me = await api.auth.me();
        if (me && typeof me === 'object' && typeof me.id === 'string') {
          const raw = me as { tenant?: unknown };
          const next: AppUser = {
            id: me.id,
            email: me.email,
            name: me.name || '',
            role: me.role,
            clinicId: me.clinicId ?? null,
            phone: me.phone,
            clinicName: me.clinicName,
            isActive: me.isActive,
            isApproved: me.isApproved,
            tenant: parseTenant(raw.tenant),
          };
          setUser(next);
          localStorage.setItem(APP_USER_KEY, JSON.stringify(next));
        } else {
          clearApiSession();
          setSession(null);
        }
      } catch {
        clearApiSession();
        setSession(null);
      }
    }
  }, [clearApiSession, syncTokenFromStorage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await restoreSession();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  useEffect(() => {
    const onExpired = () => {
      clearApiSession();
      setSession(null);
      showError('Your session has expired. Please sign in again.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('baigdentpro:auth-expired', onExpired);
    return () => window.removeEventListener('baigdentpro:auth-expired', onExpired);
  }, [clearApiSession, navigate, showError]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/portal', { replace: false, state: { recovery: true } });
      }
      if (event === 'SIGNED_OUT') {
        syncTokenFromStorage();
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, syncTokenFromStorage]);

  const login = useCallback(
    async (email: string, password: string, options?: { mode?: AuthLoginMode }) => {
      const sb = getSupabase();
      const mode: AuthLoginMode = options?.mode ?? (sb ? 'supabase' : 'api');

      if (mode === 'api' || !sb) {
        const result = await api.auth.login(email.trim(), password);
        const u = result.user as AppUser;
        const tenant = parseTenant((result as { tenant?: unknown }).tenant);
        const next: AppUser = {
          id: u.id,
          email: u.email,
          name: u.name || '',
          role: u.role,
          clinicId: u.clinicId ?? null,
          tenant,
        };
        setUser(next);
        localStorage.setItem(APP_USER_KEY, JSON.stringify(next));
        setSession(null);
        syncTokenFromStorage();
        showSuccess('Signed in successfully.');
        return;
      }

      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      if (!data.session) {
        throw new Error('Sign-in requires a confirmed email and a valid session.');
      }
      setSession(data.session);
      syncTokenFromStorage();
      try {
        const exchanged = await api.auth.exchangeSupabaseSession(data.session.access_token);
        const u = exchanged.user as AppUser;
        const tenant = parseTenant((exchanged as { tenant?: unknown }).tenant);
        const next: AppUser = {
          id: u.id,
          email: u.email,
          name: u.name || '',
          role: u.role,
          clinicId: u.clinicId ?? null,
          tenant,
        };
        setUser(next);
        localStorage.setItem(APP_USER_KEY, JSON.stringify(next));
        syncTokenFromStorage();
        showSuccess('Signed in successfully.');
      } catch (meErr) {
        await sb.auth.signOut();
        setSession(null);
        clearApiSession();
        const fallback =
          'No BaigDentPro account exists for this email, or the account is not approved yet. Register first or use the clinic portal.';
        throw new Error(meErr instanceof Error ? meErr.message : fallback);
      }
    },
    [clearApiSession, showSuccess, syncTokenFromStorage]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const sb = getSupabase();
      if (!sb) {
        throw new Error('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) throw new Error(error.message);
      const needsEmailConfirmation = !data.session;
      return {
        needsEmailConfirmation,
        message: needsEmailConfirmation
          ? 'Check your email to confirm your account before signing in.'
          : undefined,
      };
    },
    []
  );

  const registerSaasTenant = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const result = await api.auth.registerSaas(input);
      const u = result.user as AppUser;
      const tenant = parseTenant((result as { tenant?: unknown }).tenant);
      const next: AppUser = {
        id: u.id,
        email: u.email,
        name: u.name || '',
        role: u.role,
        clinicId: u.clinicId ?? null,
        tenant,
      };
      setUser(next);
      localStorage.setItem(APP_USER_KEY, JSON.stringify(next));
      syncTokenFromStorage();
      showSuccess('Account created. Welcome!');
    },
    [showSuccess, syncTokenFromStorage]
  );

  const logout = useCallback(async () => {
    try {
      await getSupabase()?.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    setSession(null);
    clearApiSession();
    showSuccess('Signed out.');
  }, [clearApiSession, showSuccess]);

  const currentUser = session?.user ?? null;
  /** Prisma-backed app user only — Supabase session alone must not unlock protected UI. */
  const isAuthenticated = Boolean(user?.id);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      token,
      session,
      currentUser,
      isAuthenticated,
      isSupabaseConfigured: isSupabaseAuthConfigured(),
      login,
      signup,
      registerSaasTenant,
      logout,
      refreshSession,
      restoreSession,
    }),
    [
      loading,
      user,
      token,
      session,
      currentUser,
      isAuthenticated,
      login,
      signup,
      registerSaasTenant,
      logout,
      refreshSession,
      restoreSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
