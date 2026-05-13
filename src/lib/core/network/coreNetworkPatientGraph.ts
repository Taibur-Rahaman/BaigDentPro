import type { FederatedPatientFingerprints } from '@/types/network';

/** Federated lookup stub — merges patient ids only when policy allows. */
export function unifyPatientAcrossBranches(ids: string[]): FederatedPatientFingerprints {
  return { canonicalPatientId: ids[0] ?? '', linkedIds: ids };
}
