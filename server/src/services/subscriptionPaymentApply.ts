import { prisma } from '../index.js';

/**
 * Applies a successful `SubscriptionPayment` to the clinic subscription (idempotent on same payment row).
 * Runs when an administrator marks a manual WhatsApp payment `PAID`.
 */
export async function applyVerifiedSubscriptionPayment(paymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pay = await prisma.subscriptionPayment.findUnique({ where: { id: paymentId } });
  const okStatus = pay?.status === 'PAID' || pay?.status === 'SUCCESS';
  if (!pay || !okStatus) {
    return { ok: false, error: 'Payment not found or not marked paid' };
  }
  const meta = (pay.metadata as Record<string, unknown> | null) ?? {};
  const applied = meta.applied === true;
  if (applied) {
    return { ok: true };
  }

  const planCode = (pay.planCode ?? '').trim().toUpperCase();
  if (!planCode) {
    return { ok: false, error: 'Payment is missing plan metadata' };
  }

  const plan = await prisma.plan.findFirst({
    where: { name: { equals: planCode, mode: 'insensitive' } },
  });
  if (!plan) {
    return { ok: false, error: 'Plan not found for payment' };
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 365);

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { clinicId: pay.clinicId },
      create: {
        clinicId: pay.clinicId,
        planId: plan.id,
        plan: plan.name.toUpperCase(),
        status: 'ACTIVE',
        startDate,
        endDate,
        expiresAt: endDate,
        autoRenew: true,
      },
      update: {
        planId: plan.id,
        plan: plan.name.toUpperCase(),
        status: 'ACTIVE',
        startDate,
        endDate,
        expiresAt: endDate,
      },
    });
    await tx.clinic.update({
      where: { id: pay.clinicId },
      data: { plan: plan.name.toUpperCase() },
    });
    const nextMeta = { ...meta, applied: true, appliedAt: new Date().toISOString() };
    await tx.subscriptionPayment.update({
      where: { id: pay.id },
      data: { metadata: nextMeta as object },
    });
  });

  return { ok: true };
}
