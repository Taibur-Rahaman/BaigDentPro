import { useState, type Dispatch, type SetStateAction } from 'react';
import type { AppointmentViewModel } from '@/viewModels';

export interface AppointmentsView {
  appointments: AppointmentViewModel[];
  setAppointments: Dispatch<SetStateAction<AppointmentViewModel[]>>;
}

export function useAppointmentsView(): AppointmentsView {
  const [appointments, setAppointments] = useState<AppointmentViewModel[]>([]);
  return { appointments, setAppointments };
}

/** Appointment schedule filters & week helpers for practice shell UI. */
export { useAppointmentsScheduleView } from './useAppointmentsScheduleView';
