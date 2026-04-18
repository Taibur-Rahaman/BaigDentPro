import { getSupabaseAdmin } from '../utils/supabaseServer.js';

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** First browser origin from FRONTEND_URL (comma-separated allowed). */
function primaryFrontendOrigin(): string | undefined {
  const raw = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const em = normalizeAuthEmail(email);
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    const found = data.users.find((u) => (u.email ?? '').toLowerCase() === em);
    if (found?.id) return found.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

/**
 * Create or update Supabase Auth user so email+password matches Prisma (sign-in + password reset).
 */
export async function syncSupabasePasswordForEmail(
  email: string,
  password: string
): Promise<{ synced: boolean; note?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { synced: false, note: 'supabase_not_configured' };
  }
  const em = normalizeAuthEmail(email);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: em,
    password,
    email_confirm: true,
  });

  if (!createErr && created.user) {
    return { synced: true };
  }

  const id = await findSupabaseUserIdByEmail(em);
  if (!id) {
    console.warn('[supabaseAuthSync] create failed & user not found:', createErr?.message ?? createErr);
    return { synced: false, note: createErr?.message ?? 'create_failed' };
  }

  const { error: upErr } = await admin.auth.admin.updateUserById(id, {
    password,
    email_confirm: true,
  });
  if (upErr) {
    console.warn('[supabaseAuthSync] update password:', upErr.message);
    return { synced: false, note: upErr.message };
  }
  return { synced: true };
}

/**
 * When a signup is approved we may not have created Supabase at register time.
 * If no Auth user exists, send the standard Supabase invite email (requires SMTP in Supabase).
 */
export async function inviteSupabaseUserIfAbsent(email: string): Promise<{ invited: boolean; note?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { invited: false, note: 'supabase_not_configured' };
  }
  const em = normalizeAuthEmail(email);
  const existing = await findSupabaseUserIdByEmail(em);
  if (existing) {
    return { invited: false };
  }

  const redirectTo = primaryFrontendOrigin();
  const { error } = await admin.auth.admin.inviteUserByEmail(em, redirectTo ? { redirectTo } : {});
  if (error) {
    console.warn('[supabaseAuthSync] invite:', error.message);
    return { invited: false, note: error.message };
  }
  return { invited: true };
}

export async function deleteSupabaseUserByEmail(email: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const id = await findSupabaseUserIdByEmail(email);
  if (!id) return;
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.warn('[supabaseAuthSync] delete user:', error.message);
  }
}

/** Keeps Supabase JWT `app_metadata.session_version` aligned with Prisma `User.sessionVersion` for API auth parity. */
export async function syncSupabaseSessionVersionForEmail(email: string, sessionVersion: number): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const em = normalizeAuthEmail(email);
  const id = await findSupabaseUserIdByEmail(em);
  if (!id) return;
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { session_version: sessionVersion },
  });
  if (error) {
    console.warn('[supabaseAuthSync] session_version metadata:', error.message);
  }
}
