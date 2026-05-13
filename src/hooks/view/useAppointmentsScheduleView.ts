import { useMemo, useState } from 'react';
import type { AppointmentViewModel } from '@/viewModels';
import { formatLocalYMD } from '@/viewModels/formatters';

export type AppointmentScheduleFilter = 'upcoming' | 'today' | 'week' | 'all';

type ControlledAppointmentSchedule = {
  appointmentScheduleFilter: AppointmentScheduleFilter;
  setAppointmentScheduleFilter: (v: AppointmentScheduleFilter) => void;
};

export function useAppointmentsScheduleView(
  appointments: AppointmentViewModel[],
  controlled?: ControlledAppointmentSchedule
) {
  const [internalSchedule, setInternalSchedule] = useState<AppointmentScheduleFilter>('upcoming');
  const appointmentScheduleFilter = controlled?.appointmentScheduleFilter ?? internalSchedule;
  const setAppointmentScheduleFilter =
    controlled?.setAppointmentScheduleFilter ?? setInternalSchedule;
  const [appointmentViewMode, setAppointmentViewMode] = useState<'list' | 'week'>('list');
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);

  const filteredAppointments = useMemo(() => {
    const todayYmd = formatLocalYMD(new Date());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndYmd = formatLocalYMD(weekEnd);
    const notCancelled = (a: AppointmentViewModel) => {
      const s = String(a.status).toUpperCase();
      return s !== 'CANCELLED' && s !== 'CANCELED';
    };
    let list = appointments.filter(notCancelled);
    if (appointmentScheduleFilter === 'today') list = list.filter((a) => a.date === todayYmd);
    else if (appointmentScheduleFilter === 'upcoming') list = list.filter((a) => a.date >= todayYmd);
    else if (appointmentScheduleFilter === 'week') {
      list = list.filter((a) => a.date >= todayYmd && a.date <= weekEndYmd);
    }
    return [...list].sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      return c !== 0 ? c : (a.time || '').localeCompare(b.time || '');
    });
  }, [appointments, appointmentScheduleFilter]);

  const todayAppointments = useMemo(() => {
    const today = formatLocalYMD(new Date());
    return appointments.filter((a) => a.date === today);
  }, [appointments]);

  const weekCalendarDays = useMemo(() => {
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    const day = d0.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d0);
    monday.setDate(d0.getDate() + diff + calendarWeekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const cell = new Date(monday);
      cell.setDate(monday.getDate() + i);
      return formatLocalYMD(cell);
    });
  }, [calendarWeekOffset]);

  return {
    appointmentScheduleFilter,
    setAppointmentScheduleFilter,
    appointmentViewMode,
    setAppointmentViewMode,
    calendarWeekOffset,
    setCalendarWeekOffset,
    filteredAppointments,
    todayAppointments,
    weekCalendarDays,
  };
}
