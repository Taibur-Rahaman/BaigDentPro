/** Dashboard Settings tab — header/print (synced with prescription print header). */
export type DashboardHeaderDraftState = {
  clinicName: string;
  address: string;
  phone: string;
  clinicLogo: string;
  doctorName: string;
  degree: string;
  specialization: string;
  doctorLogo: string;
};

export type DashboardPrintDraftState = {
  paperSize: 'A4' | 'A5' | 'Letter';
  headerHeight: number;
};

/** Prescription page header block — persisted under one shared key. */
export type PrescriptionHeaderSettingsState = {
  doctorName: string;
  qualification: string;
  specialization: string;
  department: string;
  college: string;
  bmdcRegNo: string;
  clinicName: string;
  clinicLogo: string;
  address: string;
  phone: string;
  email: string;
  visitTime: string;
  dayOff: string;
  doctorLogo: string;
};
