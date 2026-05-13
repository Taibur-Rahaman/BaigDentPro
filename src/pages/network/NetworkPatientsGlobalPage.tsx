import React, { useState } from 'react';
import { useNetworkPatientView } from '@/hooks/view/useNetworkPatientView';

export const NetworkPatientsGlobalPage: React.FC = () => {
  const [ids, setIds] = useState('');
  const graph = useNetworkPatientView(
    ids
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  );

  return (
    <div>
      <h1 className="pp-title">Global patient graph</h1>
      <p className="pp-muted">Paste comma-separated patient ids (demo merge).</p>
      <div className="pp-card">
        <label className="pp-field">
          <span>Ids</span>
          <input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="id-a, id-b" />
        </label>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Canonical: <strong>{graph.canonicalPatientId || '—'}</strong>
        </p>
      </div>
    </div>
  );
};
