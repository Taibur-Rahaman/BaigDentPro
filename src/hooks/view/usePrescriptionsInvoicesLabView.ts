import { useState, type Dispatch, type SetStateAction } from 'react';
import type { InvoiceViewModel, LabOrderViewModel, PrescriptionViewModel } from '@/viewModels';

export interface PrescriptionsInvoicesLabView {
  prescriptions: PrescriptionViewModel[];
  setPrescriptions: Dispatch<SetStateAction<PrescriptionViewModel[]>>;
  invoices: InvoiceViewModel[];
  setInvoices: Dispatch<SetStateAction<InvoiceViewModel[]>>;
  labOrders: LabOrderViewModel[];
  setLabOrders: Dispatch<SetStateAction<LabOrderViewModel[]>>;
}

export function usePrescriptionsInvoicesLabView(): PrescriptionsInvoicesLabView {
  const [prescriptions, setPrescriptions] = useState<PrescriptionViewModel[]>([]);
  const [invoices, setInvoices] = useState<InvoiceViewModel[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderViewModel[]>([]);
  return { prescriptions, setPrescriptions, invoices, setInvoices, labOrders, setLabOrders };
}
