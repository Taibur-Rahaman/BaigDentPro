import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function resolveSupabaseKey(): string | null {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRole) return serviceRole;

  const legacyKey = process.env.SUPABASE_KEY?.trim();
  if (legacyKey) {
    console.warn('[supabase] SUPABASE_KEY is deprecated. Use SUPABASE_SERVICE_ROLE_KEY.');
    return legacyKey;
  }
  return null;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = resolveSupabaseKey();
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && resolveSupabaseKey());
}

export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  details: string;
}> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { connected: false, details: 'Supabase is not configured (missing URL or key).' };
  }

  try {
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return { connected: false, details: `Supabase rejected admin query: ${error.message}` };
    }
    return { connected: true, details: 'Supabase admin client connected successfully.' };
  } catch (error) {
    return {
      connected: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
