import type { TenantSummary } from './tenant';

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicId: string | null;
  phone?: string | null;
  clinicName?: string | null;
  /** Honorific / prefix (e.g. Dr., Prof.) — verified profiles lock edits except Super Admin. */
  title?: string | null;
  degree?: string | null;
  specialization?: string | null;
  professionalVerified?: boolean;
  professionalVerifiedAt?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  licenseNo?: string | null;
  isActive?: boolean;
  isApproved?: boolean;
  accountStatus?: string;
  /** Effective clinic subscription (from `/api/auth/me`); server is source of truth. */
  tenant?: TenantSummary | null;
};
