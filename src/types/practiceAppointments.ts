/** Normalized appointment list row (`GET /appointments`). */
export type PracticeAppointmentListItem = {
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
};
