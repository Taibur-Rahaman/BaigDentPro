import type { Prisma } from '@prisma/client';

/**
 * Tenant isolation helpers — always merge these into Prisma `where` for clinic-owned rows.
 * Prefer `Patient.clinicId`, `Product.clinicId`, etc., over filtering only by `userId`.
 */
export const scopedPrisma = {
  patientWhere(clinicId: string, extra: Prisma.PatientWhereInput = {}): Prisma.PatientWhereInput {
    return { clinicId, ...extra };
  },
  appointmentWhere(clinicId: string, extra: Prisma.AppointmentWhereInput = {}): Prisma.AppointmentWhereInput {
    return { patient: { clinicId }, ...extra };
  },
  invoiceWhere(clinicId: string, extra: Prisma.InvoiceWhereInput = {}): Prisma.InvoiceWhereInput {
    return { clinicId, ...extra };
  },
  prescriptionWhere(clinicId: string, extra: Prisma.PrescriptionWhereInput = {}): Prisma.PrescriptionWhereInput {
    return { user: { clinicId }, ...extra };
  },
  labOrderWhere(clinicId: string, extra: Prisma.LabOrderWhereInput = {}): Prisma.LabOrderWhereInput {
    return { user: { clinicId }, ...extra };
  },
};
