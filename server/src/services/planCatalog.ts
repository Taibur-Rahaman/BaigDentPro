import type { Plan, Subscription } from '@prisma/client';
import { prisma } from '../index.js';

export type SubscriptionWithPlan = Subscription & { planRef: Plan | null };

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

/** Deep-merge plan JSON with per-clinic subscription overrides (shallow keys win on override). */
export function mergePlanFeatures(planFeatures: unknown, subscriptionFeatures: unknown): Record<string, unknown> {
  return { ...asRecord(planFeatures), ...asRecord(subscriptionFeatures) };
}

export function maxBranchesAllowed(merged: Record<string, unknown>): number {
  const b = merged.branches;
  if (b === 'unlimited') return Number.MAX_SAFE_INTEGER;
  if (typeof b === 'number' && Number.isFinite(b) && b >= 0) return b;
  return 1;
}

export function effectivePlanName(sub: SubscriptionWithPlan | null, clinicPlanFallback: string): string {
  const fromRef = sub?.planRef?.name?.trim();
  if (fromRef) return fromRef.toUpperCase();
  const p = (sub?.plan ?? clinicPlanFallback ?? 'FREE').trim();
  return p.toUpperCase() || 'FREE';
}

export async function resolveDeviceLimit(sub: SubscriptionWithPlan | null): Promise<number> {
  if (sub?.planRef?.deviceLimit != null && Number.isFinite(sub.planRef.deviceLimit)) {
    return sub.planRef.deviceLimit;
  }
  const tier = (sub?.plan ?? 'FREE').toUpperCase();
  const byName = await prisma.plan.findUnique({ where: { name: tier } }).catch(() => null);
  if (byName) return byName.deviceLimit;
  if (tier === 'FREE' || tier === 'TRIAL') return 100;
  if (tier === 'PRO' || tier === 'ENTERPRISE') return 10;
  return 50;
}
