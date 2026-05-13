import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord } from '@/lib/core/domainShared';
import type { ClinicProfile } from '@/types/clinicWorkspace';

function normalizeClinicProfile(raw: unknown): ClinicProfile {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    throw new ApiHttpError('Invalid clinic profile payload', 500, '');
  }
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address === null || typeof raw.address === 'string' ? raw.address : null,
    phone: raw.phone === null || typeof raw.phone === 'string' ? raw.phone : null,
    email: raw.email === null || typeof raw.email === 'string' ? raw.email : null,
    logo: raw.logo === null || typeof raw.logo === 'string' ? raw.logo : null,
    timezone: raw.timezone === null || typeof raw.timezone === 'string' ? raw.timezone : null,
    region: typeof raw.region === 'string' ? raw.region : 'BD',
    plan: typeof raw.plan === 'string' ? raw.plan : 'FREE',
    isActive: raw.isActive !== false,
  };
}

export async function coreApiClinicProfileGet(): Promise<{ profile: ClinicProfile }> {
  const raw = await coreApiRequest<unknown>('/clinic/profile', { method: 'GET' });
  if (!isRecord(raw) || raw.profile === undefined) {
    throw new ApiHttpError('Invalid clinic profile response', 500, '');
  }
  return { profile: normalizeClinicProfile(raw.profile) };
}

export type ClinicProfileUpdateInput = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  timezone?: string | null;
};

export async function coreApiClinicProfileUpdate(
  body: ClinicProfileUpdateInput
): Promise<{ profile: ClinicProfile }> {
  const raw = await coreApiRequest<unknown>('/clinic/profile', { method: 'PUT', body });
  if (!isRecord(raw) || raw.profile === undefined) {
    throw new ApiHttpError('Invalid clinic profile response', 500, '');
  }
  return { profile: normalizeClinicProfile(raw.profile) };
}
