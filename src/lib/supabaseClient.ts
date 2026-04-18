import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

let browserClient: SupabaseClient | null = null;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Browser Supabase client (auth). Session persisted in `localStorage` by default. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured() || !url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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
