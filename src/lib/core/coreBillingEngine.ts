/**
 * Client-side billing presentation + subscription resolver (amounts authoritative on server).
 */

export type BillingPresentation = {
  headline: string;
  statusChip: 'active' | 'past_due' | 'canceled' | 'trialing' | 'unknown';
  renewalHint?: string;
};

/** Map raw API payload into stable UI strings (no currency math client-side when avoidable). */
export function resolveSubscriptionPresentation(input: {
  status?: string;
  plan?: string;
  expiresAt?: string | null;
}): BillingPresentation {
  const plan = String(input.plan ?? 'FREE').trim();
  const raw = String(input.status ?? '').toUpperCase();

  let statusChip: BillingPresentation['statusChip'] = 'unknown';
  if (raw.includes('ACTIVE') || raw.includes('CURRENT')) statusChip = 'active';
  else if (raw.includes('TRIAL')) statusChip = 'trialing';
  else if (raw.includes('PAST') || raw.includes('OVERDUE')) statusChip = 'past_due';
  else if (raw.includes('CANCEL')) statusChip = 'canceled';

  const renewalHint =
    input.expiresAt && statusChip !== 'canceled'
      ? `Renew / review by ${new Date(input.expiresAt).toLocaleDateString()}`
      : undefined;

  return {
    headline: `${plan} · ${statusChip.replace('_', ' ')}`,
    statusChip,
    renewalHint,
  };
}

/** Usage counters placeholder — extend when metering API lands */
export type UsageCounters = Record<string, number>;

export interface UsageTrackingSink {
  record(event: string, qty?: number): void;
}

export function createNoopUsageSink(): UsageTrackingSink {
  const record = () => {};
  return { record };
}
