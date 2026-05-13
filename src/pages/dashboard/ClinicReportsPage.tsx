import React from 'react';
import { ApiError } from '@/components/ApiError';
import { usePracticeReportsView } from '@/hooks/view/usePracticeReportsView';

export const ClinicReportsPage: React.FC = () => {
  const { from, setFrom, to, setTo, busy, error, rangeValid, exportAppointments, exportInvoices, clearError } =
    usePracticeReportsView();

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Reports</h1>
        <p className="tenant-page-lead">Export operational data for the selected period (CSV for spreadsheets).</p>
      </div>

      {error ? <ApiError message={error} title="Export failed" onRetry={() => clearError()} /> : null}

      <div className="tenant-card" style={{ padding: '1.25rem', maxWidth: 560 }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Date range</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            From
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            To
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {!rangeValid ? <p style={{ color: '#b91c1c', marginBottom: 0 }}>From must be on or before To.</p> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <button type="button" className="neo-btn neo-btn-primary" disabled={busy || !rangeValid} onClick={() => void exportAppointments()}>
            {busy ? 'Exporting…' : 'Export appointments CSV'}
          </button>
          <button type="button" className="neo-btn neo-btn-secondary" disabled={busy || !rangeValid} onClick={() => void exportInvoices()}>
            {busy ? 'Exporting…' : 'Export invoices CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};
