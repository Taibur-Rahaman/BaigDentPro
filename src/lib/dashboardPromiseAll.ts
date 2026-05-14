import type { CoreModuleName, OptionalModuleName } from '@/lib/dashboardLoaderConstants';
import { isApiHttpError } from '@/lib/apiErrors';

type Api = typeof import('@/api').default;

type PatientsListPayload = Awaited<ReturnType<Api['patients']['list']>>;
type AppointmentsListPayload = Awaited<ReturnType<Api['appointments']['list']>>;
type PrescriptionsListPayload = Awaited<ReturnType<Api['prescriptions']['list']>>;
type InvoicesListPayload = Awaited<ReturnType<Api['invoices']['list']>>;
type LabListPayload = Awaited<ReturnType<Api['lab']['list']>>;

const isDev =
  import.meta.env.DEV ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

function logCoreFailure(module: string, reason: unknown): void {
  if (!isDev) return;
  const msg = isApiHttpError(reason) ? `${reason.status} — ${reason.message}` : String(reason);
  console.error(`[DASHBOARD] CRITICAL FAILURE: ${module} module broke dashboard — ${msg}`, reason);
}

function withCoreFailureLog<T>(module: string, p: Promise<T>): Promise<T> {
  return p.catch((e: unknown) => {
    logCoreFailure(module, e);
    throw e;
  });
}

function unwrapOptionalSettled<T>(module: 'invoices' | 'lab', result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === 'fulfilled') return result.value;
  if (isDev) {
    const r = result.reason;
    const msg = isApiHttpError(r) ? `${r.status} — ${r.message}` : String(r);
    console.error(`[DASHBOARD] Optional module "${module}" rejected unexpectedly — using empty fallback — ${msg}`, r);
  }
  return fallback;
}

/**
 * Core EMR lists: fail fast together via Promise.all (see implementation below).
 * Optional lists: isolated with Promise.allSettled; a hard rejection in one lane does not reject before the sibling settles.
 */
export async function dashboardEntityListPromiseAll(
  core: Map<CoreModuleName, () => Promise<unknown>>,
  optional: Map<OptionalModuleName, () => Promise<unknown>>,
): Promise<{
  patients: PatientsListPayload['patients'];
  appointments: AppointmentsListPayload;
  prescriptions: PrescriptionsListPayload['prescriptions'];
  invoices: InvoicesListPayload['invoices'];
  labOrders: LabListPayload['labOrders'];
}> {
  const patientsFn = core.get('patients');
  const appointmentsFn = core.get('appointments');
  const prescriptionsFn = core.get('prescriptions');
  const invoicesFn = optional.get('invoices');
  const labFn = optional.get('lab');

  if (!patientsFn || !appointmentsFn || !prescriptionsFn || !invoicesFn || !labFn) {
    throw new Error('[dashboardPromiseAll] Missing registered fetch for patients/appointments/prescriptions/invoices/lab');
  }

  const [patientsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
    withCoreFailureLog('patients', patientsFn() as Promise<PatientsListPayload>),
    withCoreFailureLog('appointments', appointmentsFn() as Promise<AppointmentsListPayload>),
    withCoreFailureLog('prescriptions', prescriptionsFn() as Promise<PrescriptionsListPayload>),
  ]);

  const EMPTY_INVOICES: InvoicesListPayload = { invoices: [], total: 0, page: 1, limit: 500 };
  const EMPTY_LAB: LabListPayload = { labOrders: [], total: 0, page: 1, limit: 500 };

  const optionalSettled = await Promise.allSettled([
    invoicesFn() as Promise<InvoicesListPayload>,
    labFn() as Promise<LabListPayload>,
  ]);

  const invoicesRes = unwrapOptionalSettled('invoices', optionalSettled[0], EMPTY_INVOICES);
  const labRes = unwrapOptionalSettled('lab', optionalSettled[1], EMPTY_LAB);

  return {
    patients: patientsRes.patients,
    appointments: appointmentsRes,
    prescriptions: prescriptionsRes.prescriptions,
    invoices: invoicesRes.invoices,
    labOrders: labRes.labOrders,
  };
}

/**
 * Dashboard aggregate widgets — keeps `practiceDashboardLoaders.ts` free of raw `Promise.all(`.
 */
export async function dashboardAggregatesParallel<T extends readonly unknown[]>(
  tasks: readonly [...{ [K in keyof T]: Promise<T[K]> }],
): Promise<T> {
  return Promise.all(tasks) as Promise<T>;
}
