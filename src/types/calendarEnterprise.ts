/** Enterprise scheduling domain — transport-agnostic (core engine + hooks consume these shapes). */

export type OperatoryId = string;

/** Chair / room / resource that can hold one active clinical block at a time. */
export type Operatory = {
  id: OperatoryId;
  clinicId: string;
  name: string;
  /** Short code for column headers (e.g. OP1) */
  code?: string;
  isActive: boolean;
  /** Default appointment slot length when not overridden by procedure rules */
  defaultSlotMinutes?: number;
};

export type TimeSlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'BUFFER';

/** Atomic schedulable slice on a single operatory axis. */
export type TimeSlot = {
  id: string;
  clinicId: string;
  operatoryId: OperatoryId;
  startEpochMs: number;
  endEpochMs: number;
  status: TimeSlotStatus;
};

/** Booked (or proposed) patient work on the calendar. */
export type AppointmentBlock = {
  id: string;
  patientId: string;
  patientLabel: string;
  operatoryId: OperatoryId;
  startEpochMs: number;
  endEpochMs: number;
  procedureCodes?: string[];
  providerId?: string;
  notes?: string;
  /** When true, engine treats as tentative (soft conflicts) */
  isTentative?: boolean;
};

/** Recurring / weekly availability for providers or clinic-wide blocks. */
export type AvailabilityRule = {
  id: string;
  clinicId: string;
  /** When set, rule applies only to this provider */
  providerId?: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Minutes from midnight local (0–1440) */
  startMinutes: number;
  endMinutes: number;
  /** Empty/undefined = applies to all operatories in clinic */
  operatoryIds?: OperatoryId[];
  effectiveFromEpochMs?: number;
  effectiveToEpochMs?: number;
};

export type ScheduleConflictKind =
  | 'OVERLAP'
  | 'OUTSIDE_HOURS'
  | 'OPERATORY_MISMATCH'
  | 'BUFFER_VIOLATION'
  | 'DOUBLE_BOOK'
  | 'DURATION_INVALID';

export type ScheduleConflict = {
  id: string;
  kind: ScheduleConflictKind;
  severity: 'error' | 'warning';
  message: string;
  blockIds: string[];
  operatoryId?: OperatoryId;
};

export type DayScheduleColumn = {
  operatoryId: OperatoryId;
  operatoryLabel: string;
  /** Blocks overlapping this day window, sorted by start */
  blocks: AppointmentBlock[];
};

export type DayScheduleGrid = {
  dayStartEpochMs: number;
  dayEndEpochMs: number;
  slotMinutes: number;
  columns: DayScheduleColumn[];
  conflicts: ScheduleConflict[];
};
