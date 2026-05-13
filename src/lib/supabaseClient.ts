import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

let browserClient: SupabaseClient | null = null;

/** In-memory auth storage — avoids `localStorage` outside `coreApiClient` policy (session clears on full reload). */
function createMemoryAuthStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Browser Supabase client (auth). Uses in-memory session storage (architecture lock). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured() || !url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? createMemoryAuthStorage() : undefined,
      },
    });
  }
  return browserClient;
}

/** Supabase access JWT for `Authorization: Bearer` when the app Prisma JWT is not set. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    const t = data.session?.access_token?.trim();
    return t || null;
  } catch {
    return null;
  }
}
