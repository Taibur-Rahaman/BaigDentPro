/* eslint-disable react-refresh/only-export-components -- context module exports types + provider */
import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { getSupabase, isSupabaseAuthConfigured } from '@/lib/supabaseClient';
import { getSpaOrigin } from '@/lib/spaOrigin';
import type { AppUser } from '@/types/appUser';
import { setErrorHandlerUserContext } from '@/lib/errorHandler';
import { IDLE_SESSION_WALL_MS, setIdleLogoutMarker } from '@/lib/idleSessionLogout';

export type { AppUser } from '@/types/appUser';
export type { TenantSummary } from '@/types/tenant';

export type AuthContextValue = {
  loading: boolean;
  /** API user from `/api/auth/me` or login payload (primary session for SaaS). */
  user: AppUser | null;
  /** Access JWT mirror (same value as persisted access token when set). */
  token: string | null;
  session: Session | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  signup: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean; message?: string }>;
  registerSaasTenant: (input: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { showSuccess } = useToastBridge();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = api.session.getUserSnapshotJson();
      if (!raw) return null;
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  });
  const [token, setTokenState] = useState<string | null>(() => api.session.getAccessToken());

  const syncTokenFromStorage = useCallback(() => {
    setTokenState(api.session.getAccessToken());
  }, []);

  const clearApiSession = useCallback((dispatchAuthExpired = false) => {
    api.session.clear(dispatchAuthExpired);
    setUser(null);
    setTokenState(null);
  }, []);

  const idleSignoutInProgress = useRef(false);

  const restoreSession = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      setSession(data.session ?? null);
    } else {
      setSession(null);
    }

    syncTokenFromStorage();
    const t = api.session.getAccessToken();
    if (!t) {
      setUser(null);
      return;
    }

    try {
      const me = await api.auth.me();
      if (me) {
        setUser(me);
        api.session.setUserSnapshotJson(JSON.stringify(me));
      } else {
        clearApiSession(false);
      }
    } catch {
      clearApiSession(false);
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
    const hadToken = Boolean(api.session.getAccessToken());
    if (hadToken) {
      try {
        const me = await api.auth.me();
        if (me) {
          setUser(me);
          api.session.setUserSnapshotJson(JSON.stringify(me));
        } else {
          clearApiSession(true);
          setSession(null);
        }
      } catch {
        clearApiSession(true);
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
      navigate('/login', { replace: true });
    };
    window.addEventListener('baigdentpro:auth-expired', onExpired);
    return () => window.removeEventListener('baigdentpro:auth-expired', onExpired);
  }, [clearApiSession, navigate]);

  /** 1h idle: silent session end; login page shows info modal via sessionStorage marker. */
  useEffect(() => {
    if (loading || !user?.id) {
      idleSignoutInProgress.current = false;
      return undefined;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedule = () => {
      clearTimer();
      timeoutId = setTimeout(() => {
        void (async () => {
          if (idleSignoutInProgress.current) return;
          idleSignoutInProgress.current = true;
          try {
            setIdleLogoutMarker();
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
            clearApiSession(false);
          } catch {
            setSession(null);
            clearApiSession(false);
          }
        })();
      }, IDLE_SESSION_WALL_MS);
    };

    const onActivity = () => {
      if (document.visibilityState !== 'visible') return;
      schedule();
    };

    const ctrl = new AbortController();
    const opts: AddEventListenerOptions = { passive: true, signal: ctrl.signal };
    window.addEventListener('mousedown', onActivity, opts);
    window.addEventListener('keydown', onActivity, opts);
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('click', onActivity, opts);
    window.addEventListener('wheel', onActivity, opts);
    schedule();

    return () => {
      clearTimer();
      ctrl.abort();
    };
  }, [loading, user?.id, clearApiSession]);

  useEffect(() => {
    setErrorHandlerUserContext({
      name: user?.name ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      clinicName: user?.clinicName ?? null,
      clinicId: user?.clinicId ?? null,
    });
  }, [user]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/staff-portal', { replace: false, state: { recovery: true } });
      }
      if (event === 'SIGNED_OUT') {
        syncTokenFromStorage();
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, syncTokenFromStorage]);

  /**
   * JWT login via `api.auth.login`. On failure, rejects with the original error (typed HTTP, network, etc.).
   * Pages must handle failures only with `loginErrorMessageForUser` from `@/lib/apiErrors` — never branch on status or message strings in UI for this flow.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<AppUser> => {
      const result = await api.auth.login(email.trim(), password);
      setUser(result.user);
      api.session.setUserSnapshotJson(JSON.stringify(result.user));
      setSession(null);
      try {
        await getSupabase()?.auth.signOut();
      } catch {
        /* ignore */
      }
      syncTokenFromStorage();
      showSuccess('Signed in successfully.');
      return result.user;
    },
    [showSuccess, syncTokenFromStorage]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const sb = getSupabase();
      if (!sb) {
        throw new Error('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      const redirectTo =
        typeof window !== 'undefined' ? `${getSpaOrigin().replace(/\/$/, '')}/login` : undefined;
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
      if (result.token) {
        setUser(result.user);
        api.session.setUserSnapshotJson(JSON.stringify(result.user));
        syncTokenFromStorage();
        showSuccess('Account created. Welcome!');
        return;
      }

      clearApiSession();
      showSuccess(
        result.message ||
          'Account created and pending approval. Please sign in after your clinic is approved.'
      );
    },
    [clearApiSession, showSuccess, syncTokenFromStorage]
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
    // ProtectedRoute will redirect and unmount AuthenticatedLayout (banner state is component-local only).
    showSuccess('Signed out.');
  }, [clearApiSession, showSuccess]);

  useEffect(() => {
    /** Refresh rotation failed — silent redirect (no “Signed out” toast); GlobalErrorModal shows session state if 401 was captured. */
    api.session.setRefreshFailedHandler(async () => {
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
      clearApiSession(false);
      navigate('/login', { replace: true });
    });
    return () => api.session.setRefreshFailedHandler(null);
  }, [clearApiSession, navigate]);

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
