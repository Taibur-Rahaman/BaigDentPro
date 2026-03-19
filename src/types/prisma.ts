/// <reference types="@prisma/client/index.d.ts" />

// Shared Prisma types for frontend
// Run `cd server && npx prisma generate` to regenerate

import type { Prisma, PrismaClient } from '@prisma/client';

// Re-export key types
export type { Prisma, PrismaClient };

// Patient types
export type Patient = Prisma.PatientGetPayload<{
  include: {
    medicalHistory: true;
    dentalCharts: true;
    treatmentPlans: true;
    treatmentRecords: true;
  };
}>;

// Prescription types
export type Prescription = Prisma.PrescriptionGetPayload<{
  include: {
    patient: true;
    items: true;
  };
}>;

// Common args
export type PatientWhereInput = Prisma.PatientWhereInput;
export type PrescriptionWhereInput = Prisma.PrescriptionWhereInput;

// API Response wrappers
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

