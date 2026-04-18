/** Merge tenant scope into Prisma `where` (AND-composition). */
export function mergeTenantWhere(where: unknown, scope: Record<string, unknown>): Record<string, unknown> {
  const w = where && typeof where === 'object' && !Array.isArray(where) ? (where as Record<string, unknown>) : {};
  if (Object.keys(w).length === 0) return { ...scope };
  return { AND: [w, scope] };
}

export function ensureClinicIdOnCreateData(data: unknown, clinicId: string): Record<string, unknown> {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? { ...(data as Record<string, unknown>) } : {};
  const existing = d.clinicId;
  if (typeof existing === 'string' && existing.trim() && existing.trim() !== clinicId) {
    throw new Error('Tenant mismatch: clinicId on create does not match request scope');
  }
  d.clinicId = clinicId;
  return d;
}

export function ensureNestedPatientClinic(data: unknown, clinicId: string): void {
  const d = data as { patient?: { connect?: { id?: string }; create?: { clinicId?: string } } };
  if (d?.patient?.create && typeof d.patient.create === 'object') {
    const c = d.patient.create as { clinicId?: string };
    if (c.clinicId && c.clinicId !== clinicId) throw new Error('Tenant mismatch on nested patient create');
    c.clinicId = clinicId;
  }
}
