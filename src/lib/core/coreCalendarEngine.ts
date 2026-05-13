/**
 * Dentrix-style operatory engine — availability, conflicts, reschedule (pure).
 */

import type {
  AppointmentBlock,
  AvailabilityRule,
  DayScheduleGrid,
  Operatory,
  ScheduleConflict,
  ScheduleConflictKind,
  TimeSlot,
  TimeSlotStatus,
} from '@/types/calendarEnterprise';
import {
  applyBuffersToBlock,
  type AppointmentRuleConfig,
  clampDurationMinutes,
  durationMinutes,
  snapToGridEpochMs,
  validateAgainstAvailabilityRules,
  validateSlotIncrement,
} from '@/lib/core/coreAppointmentRules';

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function intervalsOverlapEpoch(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return overlaps(startA, endA, startB, endB);
}

/** Detect double-book / overlap conflicts on the same operatory (+ optional patient double-book across chairs). */
export function resolveConflicts(blocks: AppointmentBlock[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  let cid = 0;

  const byOp = new Map<string, AppointmentBlock[]>();
  for (const b of blocks) {
    const list = byOp.get(b.operatoryId) ?? [];
    list.push(b);
    byOp.set(b.operatoryId, list);
  }

  for (const [, list] of byOp) {
    const sorted = [...list].sort((x, y) => x.startEpochMs - y.startEpochMs);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const bb = sorted[j];
        if (intervalsOverlapEpoch(a.startEpochMs, a.endEpochMs, bb.startEpochMs, bb.endEpochMs)) {
          const tentative = Boolean(a.isTentative || bb.isTentative);
          cid += 1;
          conflicts.push({
            id: `c-${cid}`,
            kind: tentative ? 'OVERLAP' : 'DOUBLE_BOOK',
            severity: tentative ? 'warning' : 'error',
            message: tentative
              ? 'Overlapping tentative appointment on same operatory'
              : 'Double-booking on same operatory',
            blockIds: [a.id, bb.id],
            operatoryId: a.operatoryId,
          });
        }
      }
    }
  }

  /* Patient overlaps across operatories */
  const byPatient = new Map<string, AppointmentBlock[]>();
  for (const b of blocks) {
    const list = byPatient.get(b.patientId) ?? [];
    list.push(b);
    byPatient.set(b.patientId, list);
  }
  for (const [, list] of byPatient) {
    const sorted = [...list].sort((x, y) => x.startEpochMs - y.startEpochMs);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const bb = sorted[j];
        if (a.id === bb.id) continue;
        if (intervalsOverlapEpoch(a.startEpochMs, a.endEpochMs, bb.startEpochMs, bb.endEpochMs)) {
          cid += 1;
          conflicts.push({
            id: `c-${cid}`,
            kind: 'DOUBLE_BOOK',
            severity: 'warning',
            message: 'Patient has overlapping appointments in multiple operatories',
            blockIds: [a.id, bb.id],
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Chop [dayStart, dayEnd] into AVAILABLE slots excluding booked blocks per operatory.
 */
export function computeAvailability(params: {
  clinicId: string;
  dayStartEpochMs: number;
  dayEndEpochMs: number;
  slotMinutes: number;
  operatories: Operatory[];
  bookedBlocks: AppointmentBlock[];
}): TimeSlot[] {
  const { clinicId, dayStartEpochMs, dayEndEpochMs, slotMinutes, operatories, bookedBlocks } = params;
  const slots: TimeSlot[] = [];
  let sid = 0;

  const stepMs = Math.max(1, slotMinutes) * 60_000;

  for (const op of operatories) {
    if (!op.isActive || op.clinicId !== clinicId) continue;

    let t = dayStartEpochMs;
    while (t + stepMs <= dayEndEpochMs) {
      const end = t + stepMs;
      const blocked = bookedBlocks.some(
        (b) => b.operatoryId === op.id && overlaps(t, end, b.startEpochMs, b.endEpochMs)
      );
      sid += 1;
      const status: TimeSlotStatus = blocked ? 'BOOKED' : 'AVAILABLE';
      slots.push({
        id: `s-${op.id}-${sid}`,
        clinicId,
        operatoryId: op.id,
        startEpochMs: t,
        endEpochMs: end,
        status,
      });
      t = end;
    }
  }

  return slots;
}

/** Build chair columns with blocks intersecting the day window. */
export function generateDaySchedule(params: {
  dayStartEpochMs: number;
  dayEndEpochMs: number;
  slotMinutes: number;
  operatories: Operatory[];
  blocks: AppointmentBlock[];
}): DayScheduleGrid {
  const { dayStartEpochMs, dayEndEpochMs, slotMinutes, operatories, blocks } = params;

  const columns = operatories
    .filter((o) => o.isActive)
    .map((op) => {
      const slice = blocks
        .filter((b) => b.operatoryId === op.id && overlaps(b.startEpochMs, b.endEpochMs, dayStartEpochMs, dayEndEpochMs))
        .sort((a, bb) => a.startEpochMs - bb.startEpochMs)
        .map((b) => ({
          ...b,
          startEpochMs: Math.max(b.startEpochMs, dayStartEpochMs),
          endEpochMs: Math.min(b.endEpochMs, dayEndEpochMs),
        }));
      return {
        operatoryId: op.id as string,
        operatoryLabel: op.code ?? op.name,
        blocks: slice,
      };
    });

  const conflicts = resolveConflicts(blocks);

  return {
    dayStartEpochMs,
    dayEndEpochMs,
    slotMinutes,
    columns,
    conflicts,
  };
}

/** Pick first active operatory where proposed block fits (after optional buffer expansion). */
export function assignOperatory(params: {
  proposal: Omit<AppointmentBlock, 'operatoryId'>;
  operatories: Operatory[];
  existingBlocks: AppointmentBlock[];
  rulesCfg: AppointmentRuleConfig;
  availabilityRules: AvailabilityRule[];
}):
  | { ok: true; operatoryId: string; block: AppointmentBlock }
  | { ok: false; conflicts: ScheduleConflict[]; message: string } {
  const { proposal, operatories, existingBlocks, rulesCfg, availabilityRules } = params;
  const opMap = new Map(operatories.map((o) => [o.id, o]));

  for (const op of operatories.filter((o) => o.isActive)) {
    const block: AppointmentBlock = { ...proposal, operatoryId: op.id } as AppointmentBlock;
    const buffered = applyBuffersToBlock(block, rulesCfg);
    const others = existingBlocks.filter((b) => b.operatoryId === op.id);
    const clash = others.some((b) =>
      intervalsOverlapEpoch(buffered.startEpochMs, buffered.endEpochMs, b.startEpochMs, b.endEpochMs),
    );
    if (!clash) {
      const hoursErr = validateAgainstAvailabilityRules(block, availabilityRules, opMap);
      if (!hoursErr) {
        return { ok: true, operatoryId: op.id, block };
      }
    }
  }

  return {
    ok: false,
    conflicts: [],
    message: 'No operatory fits this interval under current rules',
  };
}

/** Move block to new start (and optionally operatory), snap to grid, revalidate via rules. */
export function rescheduleWithRules(params: {
  block: AppointmentBlock;
  newStartEpochMs: number;
  newOperatoryId?: string;
  allBlocks: AppointmentBlock[];
  operatories: Operatory[];
  availabilityRules: AvailabilityRule[];
  rulesCfg: AppointmentRuleConfig;
  dayStartEpochMs: number;
}):
  | { ok: true; block: AppointmentBlock; conflicts: ScheduleConflict[] }
  | { ok: false; conflicts: ScheduleConflict[]; message: string } {
  const {
    block,
    newStartEpochMs,
    newOperatoryId,
    allBlocks,
    operatories,
    availabilityRules,
    rulesCfg,
    dayStartEpochMs,
  } = params;

  const opId = newOperatoryId ?? block.operatoryId;
  const op = operatories.find((o) => o.id === opId);
  if (!op) {
    return { ok: false, conflicts: [], message: 'Unknown operatory' };
  }

  const dur = clampDurationMinutes(durationMinutes(block), rulesCfg);
  const slotInc = rulesCfg.slotIncrementMinutes ?? 15;
  const snappedStart = snapToGridEpochMs(newStartEpochMs, slotInc, dayStartEpochMs);
  const next: AppointmentBlock = {
    ...block,
    operatoryId: opId,
    startEpochMs: snappedStart,
    endEpochMs: snappedStart + dur * 60_000,
  };

  const incErr = validateSlotIncrement(next, dayStartEpochMs, rulesCfg);
  if (incErr) {
    return { ok: false, conflicts: [], message: incErr };
  }

  const opMap = new Map(operatories.map((o) => [o.id, o]));
  const hoursErr = validateAgainstAvailabilityRules(next, availabilityRules, opMap);
  if (hoursErr) {
    const k: ScheduleConflictKind = 'OUTSIDE_HOURS';
    return {
      ok: false,
      conflicts: [
        {
          id: 'rule-hours',
          kind: k,
          severity: 'error',
          message: hoursErr,
          blockIds: [next.id],
          operatoryId: opId,
        },
      ],
      message: hoursErr,
    };
  }

  const others = allBlocks.filter((b) => b.id !== block.id);
  const buffered = applyBuffersToBlock(next, rulesCfg);
  const clash = others.some(
    (b) =>
      b.operatoryId === next.operatoryId &&
      intervalsOverlapEpoch(buffered.startEpochMs, buffered.endEpochMs, b.startEpochMs, b.endEpochMs)
  );
  if (clash) {
    const cfs = resolveConflicts([...others, next]);
    return { ok: false, conflicts: cfs, message: 'Conflicts after reschedule' };
  }

  return { ok: true, block: next, conflicts: resolveConflicts([...others, next]) };
}
