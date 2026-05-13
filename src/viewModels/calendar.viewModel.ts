import type { AppointmentBlock, DayScheduleGrid } from '@/types/calendarEnterprise';

/** UI row: one horizontal time line across operatories */
export type WeekGridRowVM = {
  label: string;
  startEpochMs: number;
  endEpochMs: number;
};

export type CalendarBlockChipVM = {
  block: AppointmentBlock;
  topPercent: number;
  heightPercent: number;
  conflict: boolean;
};

export function calendarBlocksToChips(
  block: AppointmentBlock,
  dayStart: number,
  dayEnd: number,
  conflictIds: Set<string>
): CalendarBlockChipVM {
  const span = dayEnd - dayStart;
  const top = span > 0 ? ((Math.max(dayStart, block.startEpochMs) - dayStart) / span) * 100 : 0;
  const h =
    span > 0
      ? ((Math.min(dayEnd, block.endEpochMs) - Math.max(dayStart, block.startEpochMs)) / span) * 100
      : 0;
  return {
    block,
    topPercent: top,
    heightPercent: Math.max(4, h),
    conflict: conflictIds.has(block.id),
  };
}

export function buildWeekGridLabels(dayStartEpochMs: number, hours = 14, startHour = 7): WeekGridRowVM[] {
  const rows: WeekGridRowVM[] = [];
  const d = new Date(dayStartEpochMs);
  d.setHours(startHour, 0, 0, 0);
  for (let i = 0; i < hours; i++) {
    const s = d.getTime();
    d.setHours(d.getHours() + 1);
    const e = d.getTime();
    rows.push({
      label: new Date(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      startEpochMs: s,
      endEpochMs: e,
    });
  }
  return rows;
}

export type DayScheduleVM = DayScheduleGrid & {
  conflictBlockIds: string[];
};
