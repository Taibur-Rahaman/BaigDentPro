import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../index.js';
import { JWT_REFRESH_EXPIRES_DAYS } from '../utils/config.js';

const REFRESH_DAYS = JWT_REFRESH_EXPIRES_DAYS;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generateRefreshTokenRaw(): string {
  return randomBytes(48).toString('base64url');
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = generateRefreshTokenRaw();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86_400_000);
  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });
  return raw;
}

export async function validateRefreshToken(raw: string) {
  const tokenHash = hashToken(raw.trim());
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          isActive: true,
          isApproved: true,
          accountStatus: true,
          sessionVersion: true,
          title: true,
          degree: true,
          specialization: true,
          clinicName: true,
          clinicAddress: true,
          clinicPhone: true,
          professionalVerified: true,
        },
      },
    },
  });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (!row.user.isActive || !row.user.isApproved) return null;
  if (
    row.user.role !== 'SUPER_ADMIN' &&
    String(row.user.accountStatus ?? '').toUpperCase() !== 'ACTIVE'
  ) {
    return null;
  }
  return row;
}

export async function revokeRefreshTokenByRaw(raw: string): Promise<boolean> {
  const tokenHash = hashToken(raw.trim());
  const r = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count > 0;
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
