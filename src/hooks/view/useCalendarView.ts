import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppointmentBlock, AvailabilityRule, DayScheduleGrid, Operatory } from '@/types/calendarEnterprise';
import {
  computeAvailability,
  generateDaySchedule,
  rescheduleWithRules,
  resolveConflicts,
} from '@/lib/core/coreCalendarEngine';
import type { AppointmentRuleConfig } from '@/lib/core/coreAppointmentRules';
import type { WeekGridRowVM } from '@/viewModels/calendar.viewModel';
import { buildWeekGridLabels } from '@/viewModels/calendar.viewModel';
export type CalendarViewMode = 'week' | 'day';

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function seedDemoBlocks(weekMonday: Date, operatories: Operatory[]): AppointmentBlock[] {
  if (operatories.length < 2) return [];
  const d0 = new Date(weekMonday);
  const day2 = addDays(d0, 2);
  const slot = (hour: number, min: number) => {
    const t = new Date(day2);
    t.setHours(hour, min, 0, 0);
    return t.getTime();
  };
  return [
    {
      id: 'demo-1',
      patientId: 'p1',
      patientLabel: 'R. Karim',
      operatoryId: operatories[0].id,
      startEpochMs: slot(9, 0),
      endEpochMs: slot(9, 45),
      procedureCodes: ['D0120'],
    },
    {
      id: 'demo-2',
      patientId: 'p2',
      patientLabel: 'S. Ahmed',
      operatoryId: operatories[0].id,
      startEpochMs: slot(9, 30),
      endEpochMs: slot(10, 15),
      procedureCodes: ['D1110'],
      isTentative: true,
    },
  ];
}

const RULES_CFG: AppointmentRuleConfig = {
  slotIncrementMinutes: 15,
  bufferBeforeMinutes: 5,
  bufferAfterMinutes: 5,
  minDurationMinutes: 15,
  maxDurationMinutes: 240,
};

export function useCalendarView(params: {
  clinicId: string;
  operatories: Operatory[];
  availabilityRules: AvailabilityRule[];
  initialBlocks?: AppointmentBlock[];
}) {
  const { clinicId, operatories, availabilityRules, initialBlocks } = params;

  const [viewMode] = useState<CalendarViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedOperatoryId, setSelectedOperatoryId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<AppointmentBlock[]>([]);
  const demoSeeded = useRef(false);

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  useEffect(() => {
    if (initialBlocks !== undefined) {
      setBlocks(initialBlocks);
      return;
    }
    if (demoSeeded.current) return;
    demoSeeded.current = true;
    setBlocks(seedDemoBlocks(weekStart, operatories.filter((o) => o.clinicId === clinicId)));
  }, [clinicId, initialBlocks, operatories, weekStart]);

  const displayedDays = useMemo(() => {
    if (viewMode === 'day') return [weekStart];
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [viewMode, weekStart]);

  const activeOpId = selectedOperatoryId ?? operatories.find((o) => o.isActive)?.id ?? null;

  const daySchedules: DayScheduleGrid[] = useMemo(() => {
    return displayedDays.map((dayDate) => {
      const dayStart = dayDate.getTime();
      const dayEnd = addDays(dayDate, 1).getTime();
      return generateDaySchedule({
        dayStartEpochMs: dayStart,
        dayEndEpochMs: dayEnd,
        slotMinutes: 15,
        operatories: operatories.filter((o) => o.clinicId === clinicId),
        blocks,
      });
    });
  }, [blocks, clinicId, displayedDays, operatories]);

  const globalConflicts = useMemo(() => resolveConflicts(blocks), [blocks]);
  const conflictBlockIds = useMemo(
    () => new Set(globalConflicts.flatMap((c) => c.blockIds)),
    [globalConflicts]
  );

  const availabilityPreview = useMemo(() => {
    if (!activeOpId) return [];
    const day = displayedDays[0] ?? weekStart;
    const dayStart = day.getTime();
    const dayEnd = addDays(day, 1).getTime();
    return computeAvailability({
      clinicId,
      dayStartEpochMs: dayStart,
      dayEndEpochMs: dayEnd,
      slotMinutes: 15,
      operatories: operatories.filter((o) => o.id === activeOpId),
      bookedBlocks: blocks,
    });
  }, [activeOpId, blocks, clinicId, displayedDays, operatories, weekStart]);

  const weekGridLabels: WeekGridRowVM[] = useMemo(() => {
    const day = displayedDays[0] ?? weekStart;
    const d = new Date(day);
    d.setHours(7, 0, 0, 0);
    return buildWeekGridLabels(d.getTime(), 13, 7);
  }, [displayedDays, weekStart]);

  const rescheduleBlock = useCallback(
    (blockId: string, newStartEpochMs: number, newOperatoryId?: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return { ok: false as const, message: 'Block not found' };
      const d0 = new Date(newStartEpochMs);
      d0.setHours(0, 0, 0, 0);
      const dayStartEpochMs = d0.getTime();
      const res = rescheduleWithRules({
        block,
        newStartEpochMs,
        newOperatoryId,
        allBlocks: blocks,
        operatories,
        availabilityRules,
        rulesCfg: RULES_CFG,
        dayStartEpochMs,
      });
      if (!res.ok) return res;
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? res.block : b)));
      return res;
    },
    [availabilityRules, blocks, operatories]
  );

  const proposeMove = useCallback(
    (blockId: string, targetDayStartEpochMs: number, operatoryColumnId: string, slotIndex: number) => {
      const slotMinutes = 15;
      const start = targetDayStartEpochMs + slotIndex * slotMinutes * 60_000;
      return rescheduleBlock(blockId, start, operatoryColumnId);
    },
    [rescheduleBlock]
  );

  const lockBlockToggle = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, isTentative: !b.isTentative } : b))
    );
  }, []);

  return {
    viewMode,
    weekOffset,
    setWeekOffset,
    weekStart,
    displayedDays,
    selectedOperatoryId,
    setSelectedOperatoryId,
    dragBlockId,
    setDragBlockId,
    blocks,
    setBlocks,
    globalConflicts,
    conflictBlockIds,
    daySchedules,
    availabilityPreview,
    weekGridLabels,
    rulesConfig: RULES_CFG,
    proposeMove,
    rescheduleBlock,
    lockBlockToggle,
  };
}
