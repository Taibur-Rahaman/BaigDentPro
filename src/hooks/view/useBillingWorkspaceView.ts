import { useMemo, useState } from 'react';
import type { InvoiceViewModel } from '@/viewModels';
import { formatLocalYMD } from '@/viewModels/formatters';

function invoiceIsOverdue(inv: InvoiceViewModel): boolean {
  if (inv.status === 'PAID' || inv.due <= 0) return false;
  const todayYmd = formatLocalYMD(new Date());
  if (inv.dueDate) return inv.dueDate < todayYmd;
  return inv.status === 'OVERDUE';
}

export type BillingInvoiceFilter = 'all' | 'open' | 'overdue' | 'paid';

type ControlledBillingFilter = {
  billingInvoiceFilter: BillingInvoiceFilter;
  setBillingInvoiceFilter: (v: BillingInvoiceFilter) => void;
};

export function useBillingWorkspaceView(
  invoices: InvoiceViewModel[],
  controlled?: ControlledBillingFilter
) {
  const [internalFilter, setInternalFilter] = useState<BillingInvoiceFilter>('all');
  const billingInvoiceFilter = controlled?.billingInvoiceFilter ?? internalFilter;
  const setBillingInvoiceFilter = controlled?.setBillingInvoiceFilter ?? setInternalFilter;

  const filteredInvoicesForBilling = useMemo(() => {
    return invoices.filter((inv) => {
      if (billingInvoiceFilter === 'paid') return inv.status === 'PAID';
      if (billingInvoiceFilter === 'open') return inv.status !== 'PAID';
      if (billingInvoiceFilter === 'overdue') return invoiceIsOverdue(inv);
      return true;
    });
  }, [invoices, billingInvoiceFilter]);

  const revenueToday = useMemo(() => {
    const ymd = formatLocalYMD(new Date());
    return invoices.filter((i) => i.status === 'PAID' && i.date === ymd).reduce((s, i) => s + (i.paid || 0), 0);
  }, [invoices]);

  return {
    billingInvoiceFilter,
    setBillingInvoiceFilter,
    filteredInvoicesForBilling,
    revenueToday,
    invoiceIsOverdue,
  };
}
