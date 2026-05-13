/** Hospital-scale domain shapes (frontend contract; backend wiring follows in dedicated PRs). */

export type OrganizationNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type BranchNode = {
  id: string;
  clinicId: string;
  organizationId: string | null;
  name: string;
};

export type Department = {
  id: string;
  branchId: string;
  name: string;
  specialty: string;
};

export type NetworkStaffRole = {
  id: string;
  label: string;
  scope: 'org' | 'branch' | 'department';
};

export type FederatedPatientFingerprints = {
  canonicalPatientId: string;
  linkedIds: string[];
};

export type NetworkPolicy = { id: string; description: string; severity: 'info' | 'warning' | 'block' };
