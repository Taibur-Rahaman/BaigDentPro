/**
 * Appointment slot validation — pure rules (no I/O).
 */

import type { AppointmentBlock, AvailabilityRule, Operatory } from '@/types/calendarEnterprise';

export type AppointmentRuleConfig = {
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  slotIncrementMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

const DEFAULT_SLOT_INC = 5;
const DEFAULT_MIN_MIN = 5;
const DEFAULT_MAX_MIN = 8 * 60;

export function clampDurationMinutes(durationMin: number, cfg: AppointmentRuleConfig): number {
  const min = cfg.minDurationMinutes ?? DEFAULT_MIN_MIN;
  const max = cfg.maxDurationMinutes ?? DEFAULT_MAX_MIN;
  if (!Number.isFinite(durationMin)) return min;
  return Math.min(max, Math.max(min, Math.round(durationMin)));
}

export function snapToGridEpochMs(epochMs: number, slotMinutes: number, dayStartEpochMs: number): number {
  const inc = Math.max(1, slotMinutes || DEFAULT_SLOT_INC) * 60_000;
  const rel = epochMs - dayStartEpochMs;
  const snapped = Math.floor(rel / inc) * inc;
  return dayStartEpochMs + snapped;
}

export function applyBuffersToBlock(block: AppointmentBlock, cfg: AppointmentRuleConfig): AppointmentBlock {
  const before = (cfg.bufferBeforeMinutes ?? 0) * 60_000;
  const after = (cfg.bufferAfterMinutes ?? 0) * 60_000;
  return {
    ...block,
    startEpochMs: block.startEpochMs - before,
    endEpochMs: block.endEpochMs + after,
  };
}

export function durationMinutes(block: AppointmentBlock): number {
  return Math.max(0, Math.round((block.endEpochMs - block.startEpochMs) / 60_000));
}

export function validateSlotIncrement(
  block: AppointmentBlock,
  dayStartEpochMs: number,
  cfg: AppointmentRuleConfig
): string | null {
  const inc = cfg.slotIncrementMinutes ?? DEFAULT_SLOT_INC;
  const relStart = block.startEpochMs - dayStartEpochMs;
  const relEnd = block.endEpochMs - dayStartEpochMs;
  const step = inc * 60_000;
  if (step <= 0) return null;
  if (relStart % step !== 0 || relEnd % step !== 0) {
    return `Start/end must align to ${inc}-minute increments`;
  }
  return null;
}

function ruleApplies(rule: AvailabilityRule, operatoryId: string, weekday: number, epochMs: number): boolean {
  if (rule.weekday !== weekday) return false;
  if (rule.operatoryIds && rule.operatoryIds.length > 0 && !rule.operatoryIds.includes(operatoryId)) {
    return false;
  }
  if (rule.effectiveFromEpochMs != null && epochMs < rule.effectiveFromEpochMs) return false;
  if (rule.effectiveToEpochMs != null && epochMs > rule.effectiveToEpochMs) return false;
  return true;
}

function minutesSinceMidnight(epochMs: number): number {
  const d = new Date(epochMs);
  return d.getHours() * 60 + d.getMinutes();
}

export function validateAgainstAvailabilityRules(
  block: AppointmentBlock,
  rules: AvailabilityRule[],
  operatoriesById: Map<string, Pick<Operatory, 'clinicId'>>
): string | null {
  const weekday = new Date(block.startEpochMs).getDay();
  const op = operatoriesById.get(block.operatoryId);
  const clinicId = op?.clinicId ?? '';

  const dayRules = rules.filter(
    (r) =>
      r.clinicId === clinicId &&
      (!block.providerId || !r.providerId || r.providerId === block.providerId) &&
      ruleApplies(r, block.operatoryId, weekday, block.startEpochMs)
  );
  if (dayRules.length === 0 && rules.some((r) => r.clinicId === clinicId)) {
    return 'No availability rule covers this weekday or operatory';
  }

  const startMin = minutesSinceMidnight(block.startEpochMs);
  const endMin = Math.max(startMin + 1, minutesSinceMidnight(block.endEpochMs));

  for (const r of dayRules) {
    if (startMin >= r.startMinutes && endMin <= r.endMinutes) return null;
  }

  return 'Appointment is outside documented working hours';
}
