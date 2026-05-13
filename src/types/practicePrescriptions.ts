/** Single drug line normalized for practice lists. */
export type PracticePrescriptionDrugRow = {
  id: string;
  brand: string;
  dose: string;
  duration: string;
  frequency: string;
  instruction: string;
  maxDailyDose: string;
  doctorNotes: string;
  allowDoseOverride: boolean;
  beforeFood: boolean;
  afterFood: boolean;
};

/** Normalized prescription row for practice lists (from `GET /prescriptions`). */
export type PracticePrescriptionListItem = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  diagnosis: string;
  patient: { id: string; name: string; phone: string; regNo?: string };
  drugs: PracticePrescriptionDrugRow[];
};
