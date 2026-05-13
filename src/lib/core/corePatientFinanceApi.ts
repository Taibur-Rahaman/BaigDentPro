/**
 * @domain FINANCE_PATIENT_AR
 * Patient invoices, lab orders, invoice-linked comms — not SaaS subscription billing.
 * @see corePlatformSaasApi.ts for /api/payment/manual/initiate
 */
import { ApiHttpError } from '@/lib/apiErrors';
import { coreApiRequest } from '@/lib/core/coreHttpClient';
import { isRecord, numField } from '@/lib/core/domainShared';
import type {
  PracticeInvoiceDetailPayload,
  PracticeInvoiceListItem,
  PracticeInvoiceStatsPayload,
  PracticeLabOrderDetailPayload,
  PracticeLabOrderListItem,
  PracticeLabStatsPayload,
} from '@/types/practiceBilling';
import { parseCoreMessageAck, type CoreMessageAck } from '@/lib/core/coreMessageAck';

function dateFieldToYmd(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function parseInvoiceListItem(row: unknown): PracticeInvoiceListItem | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const patient = row.patient;
  const patientName = isRecord(patient) && typeof patient.name === 'string' ? patient.name : 'Unknown';
  const dueRaw = row.dueDate;
  let dueDate: string | undefined;
  if (dueRaw instanceof Date) dueDate = dueRaw.toISOString().slice(0, 10);
  else if (typeof dueRaw === 'string' && dueRaw.trim()) dueDate = dueRaw.slice(0, 10);

  const num = (k: string) => {
    const v = row[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    return parseFloat(String(v ?? 0)) || 0;
  };

  return {
    id: row.id,
    invoiceNo: typeof row.invoiceNo === 'string' ? row.invoiceNo : '',
    patientName,
    total: num('total'),
    paid: num('paid'),
    due: num('due'),
    date: dateFieldToYmd(row.date),
    dueDate,
    status: typeof row.status === 'string' ? row.status : 'PENDING',
  };
}

function parseLabOrderListItem(row: unknown): PracticeLabOrderListItem | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  const patient = row.patient;
  const patientName = isRecord(patient) && typeof patient.name === 'string' ? patient.name : 'Unknown';
  return {
    id: row.id,
    patientName,
    workType: typeof row.workType === 'string' ? row.workType : '',
    status: typeof row.status === 'string' ? row.status : 'PENDING',
    orderDate: dateFieldToYmd(row.orderDate),
  };
}

export async function coreApiInvoicesList(params?: {
  patientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ invoices: PracticeInvoiceListItem[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.patientId) q.set('patientId', params.patientId);
  if (params?.status) q.set('status', params.status);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 50));
  const raw = await coreApiRequest<unknown>(`/invoices?${q.toString()}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.invoices)) {
    throw new ApiHttpError('Invalid invoices list response', 500, '');
  }
  const invoices = raw.invoices.map(parseInvoiceListItem).filter((x): x is PracticeInvoiceListItem => x !== null);
  return {
    invoices,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}

export async function coreApiLabList(params?: {
  patientId?: string;
  status?: string;
  workType?: string;
  page?: number;
  limit?: number;
}): Promise<{ labOrders: PracticeLabOrderListItem[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.patientId) q.set('patientId', params.patientId);
  if (params?.status) q.set('status', params.status);
  if (params?.workType) q.set('workType', params.workType);
  q.set('page', String(params?.page ?? 1));
  q.set('limit', String(params?.limit ?? 50));
  const raw = await coreApiRequest<unknown>(`/lab?${q.toString()}`, { method: 'GET' });
  if (!isRecord(raw) || !Array.isArray(raw.labOrders)) {
    throw new ApiHttpError('Invalid lab orders list response', 500, '');
  }
  const labOrders = raw.labOrders.map(parseLabOrderListItem).filter((x): x is PracticeLabOrderListItem => x !== null);
  return {
    labOrders,
    total: numField(raw, 'total'),
    page: numField(raw, 'page') || 1,
    limit: numField(raw, 'limit') || 50,
  };
}

function parseInvoiceDetailPayload(raw: unknown): PracticeInvoiceDetailPayload | null {
  const base = parseInvoiceListItem(raw);
  if (!base) return null;
  if (!isRecord(raw)) return { ...base };
  const patientId = typeof raw.patientId === 'string' ? raw.patientId : undefined;
  const itemsRaw = raw.items;
  let items: PracticeInvoiceDetailPayload['items'];
  if (Array.isArray(itemsRaw)) {
    items = itemsRaw
      .map((it) => {
        if (!isRecord(it)) return null;
        return {
          description: typeof it.description === 'string' ? it.description : '',
          amount: typeof it.amount === 'number' ? it.amount : parseFloat(String(it.amount ?? 0)) || 0,
          quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
  return { ...base, patientId, items };
}

export async function coreApiInvoicesStats(): Promise<PracticeInvoiceStatsPayload> {
  const raw = await coreApiRequest<unknown>('/invoices/stats', { method: 'GET' });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid invoice stats response', 500, '');
  return {
    totalRevenue: numField(raw, 'totalRevenue'),
    monthlyRevenue: numField(raw, 'monthlyRevenue'),
    pendingDue: numField(raw, 'pendingDue'),
    paidThisMonth: numField(raw, 'paidThisMonth'),
  };
}

export async function coreApiInvoiceById(id: string): Promise<PracticeInvoiceDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}`, { method: 'GET' });
  const p = parseInvoiceDetailPayload(raw);
  if (!p) throw new ApiHttpError('Invalid invoice response', 500, '');
  return p;
}

export async function coreApiInvoiceCreate(body: Record<string, unknown>): Promise<PracticeInvoiceDetailPayload> {
  const raw = await coreApiRequest<unknown>('/invoices', { method: 'POST', body });
  const p = parseInvoiceDetailPayload(raw);
  if (!p) throw new ApiHttpError('Invalid invoice response', 500, '');
  return p;
}

export async function coreApiInvoiceUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<PracticeInvoiceDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}`, { method: 'PUT', body });
  const p = parseInvoiceDetailPayload(raw);
  if (!p) throw new ApiHttpError('Invalid invoice response', 500, '');
  return p;
}

export async function coreApiInvoiceDelete(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiInvoiceAddPayment(
  id: string,
  body: Record<string, unknown>
): Promise<PracticeInvoiceDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}/payments`, {
    method: 'POST',
    body,
  });
  const p = parseInvoiceDetailPayload(raw);
  if (!p) throw new ApiHttpError('Invalid invoice response', 500, '');
  return p;
}

export async function coreApiInvoiceSendEmail(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}/send-email`, { method: 'POST' });
  return parseCoreMessageAck(raw);
}

export async function coreApiInvoiceSendWhatsApp(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/invoices/${encodeURIComponent(id)}/send-whatsapp`, { method: 'POST' });
  return parseCoreMessageAck(raw);
}

export async function coreApiLabPending(): Promise<PracticeLabOrderListItem[]> {
  const raw = await coreApiRequest<unknown>('/lab/pending', { method: 'GET' });
  if (!Array.isArray(raw)) throw new ApiHttpError('Invalid lab pending response', 500, '');
  return raw.map(parseLabOrderListItem).filter((x): x is PracticeLabOrderListItem => x !== null);
}

export async function coreApiLabStats(): Promise<PracticeLabStatsPayload> {
  const raw = await coreApiRequest<unknown>('/lab/stats', { method: 'GET' });
  if (!isRecord(raw)) throw new ApiHttpError('Invalid lab stats response', 500, '');
  return {
    pending: numField(raw, 'pending'),
    inProgress: numField(raw, 'inProgress'),
    ready: numField(raw, 'ready'),
    delivered: numField(raw, 'delivered'),
  };
}

function parseLabOrderDetail(row: unknown): PracticeLabOrderDetailPayload | null {
  const base = parseLabOrderListItem(row);
  if (!base || !isRecord(row)) return null;
  const pid = typeof row.patientId === 'string' ? row.patientId : null;
  if (!pid) return null;
  return {
    ...base,
    patientId: pid,
    description: typeof row.description === 'string' ? row.description : null,
    toothNumber:
      row.toothNumber === null || row.toothNumber === undefined
        ? null
        : typeof row.toothNumber === 'string' || typeof row.toothNumber === 'number'
          ? String(row.toothNumber)
          : null,
    shade: row.shade === null || typeof row.shade === 'string' ? row.shade : null,
  };
}

export async function coreApiLabOrderById(id: string): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}`, { method: 'GET' });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabCreate(body: Record<string, unknown>): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>('/lab', { method: 'POST', body });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}`, { method: 'PUT', body });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabDelete(id: string): Promise<CoreMessageAck> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return parseCoreMessageAck(raw);
}

export async function coreApiLabSendToLab(id: string): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}/send-to-lab`, { method: 'POST' });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabMarkReady(id: string): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}/mark-ready`, { method: 'POST' });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabMarkDelivered(id: string): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}/mark-delivered`, { method: 'POST' });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}

export async function coreApiLabMarkFitted(id: string): Promise<PracticeLabOrderDetailPayload> {
  const raw = await coreApiRequest<unknown>(`/lab/${encodeURIComponent(id)}/mark-fitted`, { method: 'POST' });
  const p = parseLabOrderDetail(raw);
  if (!p) throw new ApiHttpError('Invalid lab order response', 500, '');
  return p;
}
