import type { PrismaClient } from '@prisma/client';
import { getBusinessClinicIdOrNull } from '../context/businessClinicContext.js';
import { ensureClinicIdOnCreateData, mergeTenantWhere } from './emrWhereMerge.js';

type AnyArgs = Record<string, unknown>;
type OpCtx = { operation: string; args: AnyArgs; query: (args: AnyArgs) => Promise<unknown> };

function scopePatient(clinicId: string) {
  return { patient: { clinicId } };
}

function scopeInvoice(clinicId: string) {
  return { invoice: { clinicId } };
}

function applyWhereMerge(args: AnyArgs, scope: Record<string, unknown>): void {
  args.where = mergeTenantWhere(args.where, scope);
}

/** EMR models must not be queried without request clinic context (except super-admin/seed using prismaBase). */
function assertEmrTenantContext(modelName: string, operation: string): void {
  const cid = getBusinessClinicIdOrNull();
  if (cid) return;
  throw new Error(
    `[emrTenant] Missing clinic context for ${modelName}.${operation} — use prismaBase for cross-tenant jobs or ensure businessClinicContext is set.`
  );
}

function makeEmrModelExtension(
  modelName: string,
  scope: (cid: string) => Record<string, unknown>,
  options: {
    injectCreateClinicId?: boolean;
    skipOperations?: Set<string>;
    /** When true, merge tenant scope into update/delete/findUnique/upsert (requires composite unique with clinicId where applicable). */
    mergeWrites?: boolean;
  }
) {
  const skip = options.skipOperations ?? new Set<string>();
  const mergeWrites = options.mergeWrites === true;
  return {
    async $allOperations(ctx: OpCtx) {
      const { operation, args: rawArgs, query } = ctx;
      const args: AnyArgs = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {};
      const cid = getBusinessClinicIdOrNull();
      if (!cid) {
        assertEmrTenantContext(modelName, operation);
        return query(rawArgs as AnyArgs);
      }
      if (skip.has(operation)) {
        return query(rawArgs as AnyArgs);
      }

      const sc = scope(cid);

      switch (operation) {
        case 'findMany':
        case 'findFirst':
        case 'count':
        case 'aggregate':
        case 'groupBy':
        case 'updateMany':
        case 'deleteMany':
          applyWhereMerge(args, sc);
          return query(args);
        case 'findUnique':
        case 'update':
        case 'delete':
        case 'upsert':
          if (!mergeWrites) {
            return query(rawArgs as AnyArgs);
          }
          if (operation === 'findUnique' || operation === 'update' || operation === 'delete' || operation === 'upsert') {
            applyWhereMerge(args, sc);
          }
          if (operation === 'upsert' && options.injectCreateClinicId && args.create && typeof args.create === 'object') {
            args.create = ensureClinicIdOnCreateData(args.create, cid) as unknown;
          }
          return query(args);
        case 'create':
          if (options.injectCreateClinicId && args.data) {
            args.data = ensureClinicIdOnCreateData(args.data, cid) as unknown;
          }
          return query(args);
        case 'createMany':
          if (options.injectCreateClinicId && Array.isArray(args.data)) {
            args.data = (args.data as unknown[]).map((row) => ensureClinicIdOnCreateData(row, cid)) as unknown;
          } else if (options.injectCreateClinicId && args.data) {
            args.data = ensureClinicIdOnCreateData(args.data, cid) as unknown;
          }
          return query(args);
        default:
          return query(rawArgs as AnyArgs);
      }
    },
  };
}

/**
 * Wraps the Prisma client so EMR models merge the request `businessClinicId` into queries
 * when `businessClinicContext` is active. Shop / SaaS catalog models are untouched.
 *
 * Cross-tenant tooling (super-admin, seeds) must use `prismaBase` from `server/src/db/prisma.ts`.
 */
export function attachEmrTenantExtension(base: PrismaClient): PrismaClient {
  return base.$extends({
    name: 'emrTenantGuard',
    query: {
      patient: makeEmrModelExtension('patient', (cid) => ({ clinicId: cid }), { injectCreateClinicId: true, mergeWrites: true }),
      appointment: makeEmrModelExtension('appointment', (cid) => ({ clinicId: cid }), { injectCreateClinicId: true, mergeWrites: true }),
      invoice: makeEmrModelExtension('invoice', (cid) => ({ clinicId: cid }), { injectCreateClinicId: true, mergeWrites: true }),
      payment: makeEmrModelExtension('payment', (cid) => scopeInvoice(cid), { mergeWrites: false }),
      invoiceItem: makeEmrModelExtension('invoiceItem', (cid) => scopeInvoice(cid), { mergeWrites: false }),
      treatmentPlan: makeEmrModelExtension('treatmentPlan', (cid) => scopePatient(cid), { mergeWrites: false }),
      treatmentRecord: makeEmrModelExtension('treatmentRecord', (cid) => scopePatient(cid), { mergeWrites: false }),
      dentalChart: makeEmrModelExtension('dentalChart', (cid) => scopePatient(cid), {
        skipOperations: new Set(['create', 'upsert']),
        mergeWrites: false,
      }),
      prescription: makeEmrModelExtension('prescription', (cid) => scopePatient(cid), { mergeWrites: false }),
      prescriptionItem: makeEmrModelExtension(
        'prescriptionItem',
        (cid) => ({ prescription: { patient: { clinicId: cid } } }) as Record<string, unknown>,
        { mergeWrites: false }
      ),
      labOrder: makeEmrModelExtension('labOrder', (cid) => scopePatient(cid), { mergeWrites: false }),
      medicalHistory: makeEmrModelExtension('medicalHistory', (cid) => scopePatient(cid), {
        skipOperations: new Set(['create', 'upsert']),
        mergeWrites: false,
      }),
      patientConsent: makeEmrModelExtension('patientConsent', (cid) => scopePatient(cid), { mergeWrites: false }),
    },
  }) as unknown as PrismaClient;
}
