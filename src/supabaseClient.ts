import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

let browserClient: SupabaseClient | null = null;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Browser Supabase client (auth + password recovery). Null when env is not set. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured() || !url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
