/** UI appointment list row */
export interface AppointmentViewModel {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string;
  type: string;
  status: string;
  duration?: number;
  notes?: string;
}
