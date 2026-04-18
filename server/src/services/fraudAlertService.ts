import type { Prisma } from '@prisma/client';
import { prismaBase } from '../db/prisma.js';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Persist a fraud / risk signal (best-effort, never throws). */
export async function recordFraudAlert(input: {
  rule: string;
  riskScore: number;
  riskLevel: RiskLevel;
  clinicId?: string | null;
  userId?: string | null;
  details?: Prisma.InputJsonValue;
  /** When true, mark as automated rule-engine output (see `FraudAlert.autoFlag`). */
  autoFlag?: boolean;
}): Promise<void> {
  try {
    const score = Math.max(0, Math.min(100, Math.floor(input.riskScore)));
    await prismaBase.fraudAlert.create({
      data: {
        rule: input.rule,
        riskScore: score,
        riskLevel: input.riskLevel,
        clinicId: input.clinicId ?? undefined,
        userId: input.userId ?? undefined,
        autoFlag: input.autoFlag === true,
        details: input.details === undefined ? undefined : (input.details as Prisma.InputJsonValue),
      },
    });
  } catch (e) {
    console.error('[fraudAlert]', input.rule, e instanceof Error ? e.message : e);
  }
}

export async function recordFailedLoginFraud(ip: string, emailHashHint: string): Promise<void> {
  await recordFraudAlert({
    rule: 'FAILED_LOGIN_ATTEMPT',
    riskScore: 40,
    riskLevel: 'MEDIUM',
    details: { ip, emailHashHint },
  });
}

export async function recordImpersonationFraud(
  clinicId: string,
  actorUserId: string,
  detail: string
): Promise<void> {
  await recordFraudAlert({
    rule: 'IMPERSONATION_USAGE',
    riskScore: 55,
    riskLevel: 'MEDIUM',
    clinicId,
    userId: actorUserId,
    details: { detail },
  });
}

export async function recordRateSpikeFraud(clinicId: string, ip: string): Promise<void> {
  await recordFraudAlert({
    rule: 'REQUEST_RATE_SPIKE',
    riskScore: 70,
    riskLevel: 'HIGH',
    clinicId,
    details: { ip },
  });
}

export async function recordMfsPaymentVerifyRejection(input: {
  clinicId: string;
  verifierUserId: string;
  paymentId: string;
  transactionRef?: string | null;
}): Promise<void> {
  await recordFraudAlert({
    rule: 'MFS_PAYMENT_VERIFY_REJECT',
    riskScore: 48,
    riskLevel: 'MEDIUM',
    clinicId: input.clinicId,
    userId: input.verifierUserId,
    autoFlag: true,
    details: { paymentId: input.paymentId, transactionRef: input.transactionRef ?? null },
  });
}

export async function recordAbnormalInvoiceEdit(input: {
  clinicId: string;
  userId: string;
  invoiceId: string;
  previousTotal: number;
  newTotal: number;
}): Promise<void> {
  const prev = Math.abs(input.previousTotal);
  const delta = Math.abs(input.newTotal - input.previousTotal);
  if (prev < 1) return;
  if (delta / prev < 0.5) return;
  await recordFraudAlert({
    rule: 'ABNORMAL_INVOICE_TOTAL_CHANGE',
    riskScore: 62,
    riskLevel: 'HIGH',
    clinicId: input.clinicId,
    userId: input.userId,
    autoFlag: true,
    details: {
      invoiceId: input.invoiceId,
      previousTotal: input.previousTotal,
      newTotal: input.newTotal,
    },
  });
}

export async function recordRbacDenialSpike(input: {
  clinicId: string | null;
  userId: string;
  path: string;
}): Promise<void> {
  try {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const n = await prismaBase.auditLog.count({
      where: {
        userId: input.userId,
        action: 'RBAC_DENY',
        createdAt: { gte: since },
        ...(input.clinicId ? { clinicId: input.clinicId } : {}),
      },
    });
    if (n < 12) return;
    const riskScore = Math.min(100, 35 + n * 2);
    const riskLevel = n >= 45 ? 'CRITICAL' : n >= 28 ? 'HIGH' : 'MEDIUM';
    await recordFraudAlert({
      rule: 'RBAC_DENY_SPIKE',
      riskScore,
      riskLevel,
      clinicId: input.clinicId,
      userId: input.userId,
      autoFlag: true,
      details: { denyCount15m: n, path: input.path },
    });
  } catch {
    /* ignore */
  }
}

export async function recordVerifiedPaymentDayVolume(input: {
  clinicId: string;
  dayTotalVerified: number;
  threshold?: number;
}): Promise<void> {
  const threshold = input.threshold ?? 8_000_000;
  if (input.dayTotalVerified <= threshold) return;
  await recordFraudAlert({
    rule: 'HIGH_VERIFIED_PAYMENT_DAY_VOLUME',
    riskScore: 68,
    riskLevel: 'HIGH',
    clinicId: input.clinicId,
    autoFlag: true,
    details: { dayTotalVerified: input.dayTotalVerified, threshold },
  });
}
