/** UI prescription drug line */
export interface PrescriptionDrugViewModel {
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
}

/** UI prescription summary + drugs */
export interface PrescriptionViewModel {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  diagnosis: string;
  patient: { id: string; name: string; phone: string; regNo?: string };
  drugs: PrescriptionDrugViewModel[];
}
