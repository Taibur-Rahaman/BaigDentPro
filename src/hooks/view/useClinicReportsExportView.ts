import { useCallback, useMemo, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';

type InvoiceListRow = Awaited<ReturnType<typeof api.invoices.list>>['invoices'][number];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function csvEscape(cell: string | number | null | undefined): string {
  const s = cell == null ? '' : String(cell);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const body = rows.map((line) => line.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function useClinicReportsExportView() {
  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);

  const [from, setFrom] = useState(() => isoDate(monthStart));
  const [to, setTo] = useState(() => isoDate(monthEnd));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeValid = from <= to;

  const exportAppointments = useCallback(async () => {
    if (!rangeValid) return;
    setBusy(true);
    setError(null);
    try {
      const rows = await api.appointments.list({ startDate: from, endDate: to });
      const table: Array<Array<string | number | null | undefined>> = [
        ['id', 'patientId', 'patientName', 'date', 'time', 'status', 'type', 'duration'],
      ];
      for (const a of rows) {
        table.push([a.id, a.patientId, a.patientName, a.date, a.time, a.status, a.type, a.duration ?? '']);
      }
      downloadCsv(`appointments-${from}-to-${to}.csv`, table);
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }, [from, to, rangeValid]);

  const exportInvoices = useCallback(async () => {
    if (!rangeValid) return;
    setBusy(true);
    setError(null);
    try {
      const collected: InvoiceListRow[] = [];
      let page = 1;
      const limit = 100;
      for (let guard = 0; guard < 40; guard += 1) {
        const batch = await api.invoices.list({ startDate: from, endDate: to, page, limit });
        collected.push(...batch.invoices);
        if (batch.invoices.length < limit || page * limit >= batch.total) break;
        page += 1;
      }
      const table: Array<Array<string | number | null | undefined>> = [
        ['id', 'invoiceNo', 'patientName', 'date', 'status', 'total', 'paid', 'due'],
      ];
      for (const inv of collected) {
        table.push([
          inv.id,
          inv.invoiceNo,
          inv.patientName,
          inv.date,
          inv.status,
          inv.total,
          inv.paid,
          inv.due,
        ]);
      }
      downloadCsv(`invoices-${from}-to-${to}.csv`, table);
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }, [from, to, rangeValid]);

  return {
    from,
    setFrom,
    to,
    setTo,
    busy,
    error,
    rangeValid,
    exportAppointments,
    exportInvoices,
    clearError: () => setError(null),
  };
}
