import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../index.js';
import { JWT_REFRESH_EXPIRES_DAYS } from '../utils/config.js';

const REFRESH_DAYS = JWT_REFRESH_EXPIRES_DAYS;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generatePatientPortalRefreshRaw(): string {
  return randomBytes(48).toString('base64url');
}

export async function issuePatientPortalRefreshToken(patientId: string): Promise<string> {
  const raw = generatePatientPortalRefreshRaw();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86_400_000);
  await prisma.patientPortalRefreshToken.create({
    data: { tokenHash, patientId, expiresAt },
  });
  return raw;
}

export async function validatePatientPortalRefreshToken(raw: string) {
  const tokenHash = hashToken(raw.trim());
  const row = await prisma.patientPortalRefreshToken.findUnique({
    where: { tokenHash },
    include: {
      patient: {
        select: { id: true, clinicId: true, phone: true, name: true },
      },
    },
  });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function revokePatientPortalRefreshTokenByRaw(raw: string): Promise<boolean> {
  const tokenHash = hashToken(raw.trim());
  const r = await prisma.patientPortalRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count > 0;
}
