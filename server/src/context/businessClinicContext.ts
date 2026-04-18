import { AsyncLocalStorage } from 'node:async_hooks';

export type BusinessClinicStore = { clinicId: string };

/** Request-scoped clinic id for EMR Prisma tenant guard (set after auth + requireClinicScope). */
export const businessClinicContext = new AsyncLocalStorage<BusinessClinicStore>();

export function getBusinessClinicIdOrNull(): string | null {
  return businessClinicContext.getStore()?.clinicId?.trim() || null;
}
