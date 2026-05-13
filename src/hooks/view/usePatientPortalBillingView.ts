import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { PatientPortalInvoiceRow, PatientPortalPaymentLinkResult } from '@/types/patientPortal';

export function usePatientPortalBillingView(enabled: boolean) {
  const [invoices, setInvoices] = useState<PatientPortalInvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<PatientPortalPaymentLinkResult | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setLoading(true);
    try {
      const { invoices: rows } = await api.patientPortal.listInvoices();
      setInvoices(rows);
    } catch (e) {
      setInvoices([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestPaymentLink = async (invoiceId: string) => {
    setError(null);
    setLinkBusy(true);
    setLinkResult(null);
    try {
      const res = await api.patientPortal.paymentLink(invoiceId);
      setLinkResult(res);
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setLinkBusy(false);
    }
  };

  return { invoices, loading, error, linkResult, linkBusy, reload: load, requestPaymentLink };
}
