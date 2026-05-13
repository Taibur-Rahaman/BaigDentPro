import React from 'react';
import { Link } from 'react-router-dom';
import type { ScaffoldListRow } from '@/viewModels/productModules.viewModel';

type Props = {
  title: string;
  description: string;
  moduleKey: string;
  rows: ScaffoldListRow[];
  onReload?: () => void;
};

export const ProductModulePlaceholder: React.FC<Props> = ({
  title,
  description,
  moduleKey,
  rows,
  onReload,
}) => (
  <div className="tenant-page">
    <div className="tenant-page-header">
      <h1>{title}</h1>
      <p className="tenant-page-lead">{description}</p>
      <p style={{ fontSize: 13, color: 'var(--neo-text-muted, #64748b)' }}>
        Module key <code>{moduleKey}</code> — hook-backed scaffold; replace with live API + ViewModels.
      </p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => onReload?.()}>
          Reload stub
        </button>
        <Link to="/dashboard/overview" className="neo-btn neo-btn-secondary" style={{ textDecoration: 'none' }}>
          Practice overview
        </Link>
        <Link to="/dashboard/settings" className="neo-btn neo-btn-secondary" style={{ textDecoration: 'none' }}>
          Clinic settings
        </Link>
      </div>
    </div>
    <div className="neo-panel" style={{ marginTop: 24 }}>
      <table className="neo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Label</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{r.id}</td>
              <td style={{ padding: 8 }}>{r.label}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
