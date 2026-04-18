import { prismaBase } from '../db/prisma.js';
import { syncSupabaseSessionVersionForEmail } from './supabaseAuthSync.js';

/** Bump to invalidate all access tokens for this user (JWT carries prior `sessionVersion`). */
export async function bumpSessionVersion(userId: string): Promise<void> {
  await prismaBase.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  const row = await prismaBase.user.findUnique({
    where: { id: userId },
    select: { email: true, sessionVersion: true },
  });
  if (row?.email) {
    void syncSupabaseSessionVersionForEmail(row.email, row.sessionVersion);
  }
}
