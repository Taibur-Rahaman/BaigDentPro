/** Practice workspace patient sub-state (hydrated from `GET /patients/:id` in `coreApiClient`). */

export interface PracticeMedicalHistory {
  bloodPressure?: boolean;
  heartProblems?: boolean;
  /** UI-only / extended flags (not persisted on Prisma `MedicalHistory` today). */
  cardiacHtnMiPacemaker?: boolean;
  rheumaticFever?: boolean;
  diabetes?: boolean;
  pepticUlcer?: boolean;
  jaundice?: boolean;
  asthma?: boolean;
  tuberculosis?: boolean;
  kidneyDiseases?: boolean;
  aids?: boolean;
  thyroid?: boolean;
  hepatitis?: boolean;
  stroke?: boolean;
  bleedingDisorder?: boolean;
  otherDiseases?: string;
  isPregnant?: boolean;
  isLactating?: boolean;
  allergyPenicillin?: boolean;
  allergySulphur?: boolean;
  allergyAspirin?: boolean;
  allergyLocalAnaesthesia?: boolean;
  allergyOther?: string;
  takingAspirinBloodThinner?: boolean;
  takingAntihypertensive?: boolean;
  takingInhaler?: boolean;
  takingOther?: string;
  habitSmoking?: boolean;
  habitBetelLeaf?: boolean;
  habitAlcohol?: boolean;
  habitOther?: string;
  details?: string;
}

export interface PracticeTreatmentPlan {
  id: string;
  toothNumber: string;
  diagnosis: string;
  procedure: string;
  cost: string;
  cc: string;
  cf: string;
  investigation: string;
  status: string;
}

export interface PracticeTreatmentRecord {
  id: string;
  date: string;
  treatmentDone: string;
  cost: string;
  paid: string;
  due: string;
  patientSignature?: string;
  doctorSignature?: string;
}

export interface PracticePatientConsent {
  patientId: string;
  consentText: string;
  signatureName: string;
  signatureDate: string;
  agreed: boolean;
}

/** Single tooth row from EMR dental chart (includes optional surface map M/D/O/B/L). */
export interface PracticeDentalChartRow {
  id: string;
  patientId: string;
  toothNumber: number;
  condition?: string | null;
  surfaces?: Record<string, string>;
  notes?: string | null;
  treatment?: string | null;
  treatmentDate?: string | null;
}

export type PracticePatientWorkspaceBundle = {
  medicalHistory: PracticeMedicalHistory;
  treatmentPlans: PracticeTreatmentPlan[];
  treatmentRecords: PracticeTreatmentRecord[];
  consent: PracticePatientConsent | null;
  dentalTeethSelected: number[];
  dentalChartRows: PracticeDentalChartRow[];
};
