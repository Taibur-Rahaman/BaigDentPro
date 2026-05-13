/** Normalized patient portal payloads (core layer contracts). */

export type PatientPortalProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  clinicId: string;
};

export type PatientPortalMedicalSection = { title: string; lines: string[] };

export type PatientPortalAppointmentRow = {
  id: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  type: string | null;
  notes: string | null;
};

export type PatientPortalInvoiceRow = {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string | null;
  status: string;
  total: number;
  paid: number;
  due: number;
};

export type PatientPortalPaymentLinkResult = {
  paymentLink: string | null;
  status: string;
  message: string;
  invoiceId: string;
  balanceDue: number;
};
