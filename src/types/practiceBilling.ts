/** Normalized invoice row from `GET /invoices` (practice dashboard). */
export type PracticeInvoiceListItem = {
  id: string;
  invoiceNo: string;
  patientName: string;
  total: number;
  paid: number;
  due: number;
  date: string;
  dueDate?: string;
  status: string;
};

/** Normalized lab order row from `GET /lab` (practice dashboard). */
export type PracticeLabOrderListItem = {
  id: string;
  patientName: string;
  workType: string;
  status: string;
  orderDate: string;
};

/** `GET /invoices/stats` aggregates. */
export type PracticeInvoiceStatsPayload = {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingDue: number;
  paidThisMonth: number;
};

/** `GET /lab/stats` counts. */
export type PracticeLabStatsPayload = {
  pending: number;
  inProgress: number;
  ready: number;
  delivered: number;
};

/** Detail row for invoice/lab GET (minimal fields used by practice UI). */
export type PracticeInvoiceDetailPayload = PracticeInvoiceListItem & {
  patientId?: string;
  items?: Array<{ description: string; amount: number; quantity?: number }>;
};

export type PracticeLabOrderDetailPayload = PracticeLabOrderListItem & {
  patientId: string;
  description?: string | null;
  toothNumber?: string | null;
  shade?: string | null;
};
