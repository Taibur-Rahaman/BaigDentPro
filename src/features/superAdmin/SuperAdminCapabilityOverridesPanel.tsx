import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/api';

type OverrideMode = '' | 'grant' | 'revoke';

function parseClinicRow(row: Record<string, unknown>): { clinicId: string | null; label: string } {
  const cid = row.clinicId;
  const clinicId = typeof cid === 'string' && cid.trim() ? cid.trim() : null;
  const nameRaw = row.clinicName;
  const clinicName = typeof nameRaw === 'string' ? nameRaw.trim() : '';
  let label = 'Unknown clinic';
  if (clinicId && clinicName) label = `${clinicName} (${clinicId})`;
  else if (clinicId) label = clinicId;
  else if (clinicName) label = clinicName;
  return { clinicId, label };
}

export function SuperAdminCapabilityOverridesPanel(props: {
  clinics: unknown[];
  showToast: (m: string) => void;
}): React.ReactElement {
  const { clinics, showToast } = props;

  const clinicOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of clinics) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const { clinicId, label } = parseClinicRow(row);
      if (clinicId) byId.set(clinicId, label);
    }
    return [...byId.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
      .map(([id, label]) => ({ id, label }));
  }, [clinics]);

  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [catalog, setCatalog] = useState<{ key: string; requiresProductFeature: string | null }[]>([]);
  const [grantByKey, setGrantByKey] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.superAdmin.capabilitiesCatalog();
        if (cancelled) return;
        setCatalog(r.capabilities);
      } catch (e: unknown) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Could not load capability catalog');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (clinicOptions.length === 0 || selectedClinicId) return;
    setSelectedClinicId(clinicOptions[0].id);
  }, [clinicOptions, selectedClinicId]);

  useEffect(() => {
    if (!selectedClinicId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.superAdmin.clinicCapabilityOverrides(selectedClinicId);
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const o of res.overrides) {
          next[o.capabilityKey] = o.grant;
        }
        setGrantByKey(next);
        setDirty(false);
      } catch (e: unknown) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Could not load overrides');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClinicId, showToast]);

  const selectOverride = useCallback((capabilityKey: string, mode: OverrideMode) => {
    setGrantByKey((prev) => {
      if (mode === '') {
        if (prev[capabilityKey] === undefined) return prev;
        const { [capabilityKey]: _removed, ...rest } = prev;
        return rest;
      }
      const grant = mode === 'grant';
      if (prev[capabilityKey] === grant) return prev;
      return { ...prev, [capabilityKey]: grant };
    });
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!selectedClinicId) return;
    const overrides = Object.entries(grantByKey).map(([capabilityKey, grant]) => ({ capabilityKey, grant }));
    setSaving(true);
    try {
      await api.superAdmin.putClinicCapabilityOverrides(selectedClinicId, overrides);
      showToast('Capability overrides saved');
      setDirty(false);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [grantByKey, selectedClinicId, showToast]);

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>
          <i className="fa-solid fa-sliders" aria-hidden /> Capability overrides
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--neo-text-muted)' }}>
          Overlay grants and revokes on top of role + plan. Live requests use merged capabilities; JWT lists refresh on
          the next login or token refresh.
        </p>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Clinic</span>
            <select
              className="form-control"
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              style={{ minWidth: 280 }}
              disabled={loading}
              aria-busy={loading}
              aria-label="Select clinic for capability overrides"
            >
              {clinicOptions.length === 0 ? (
                <option value="">Load clinics from Overview tab first</option>
              ) : (
                clinicOptions.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!dirty || saving || !selectedClinicId || loading}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save overrides'}
          </button>
        </div>
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            style={{ padding: 24, textAlign: 'center' }}
          >
            <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…
          </div>
        ) : clinicOptions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Open <strong>Overview</strong> first so clinic rows (with <code>clinicId</code>) are loaded.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 14 }} aria-label="Capability overrides">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Plan feature gate</th>
                  <th scope="col">SuperAdmin override</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((row) => {
                  const hasOverride = grantByKey[row.key] !== undefined;
                  const sel: OverrideMode = !hasOverride
                    ? ''
                    : grantByKey[row.key] === true
                      ? 'grant'
                      : 'revoke';
                  return (
                    <tr key={row.key}>
                      <td>
                        <code>{row.key}</code>
                      </td>
                      <td>{row.requiresProductFeature ?? '—'}</td>
                      <td style={{ minWidth: 200 }}>
                        <select
                          className="form-control"
                          value={sel}
                          disabled={loading}
                          aria-label={`Override for ${row.key}`}
                          onChange={(e) => selectOverride(row.key, e.target.value as OverrideMode)}
                        >
                          <option value="">Baseline (no override)</option>
                          <option value="grant">Force grant</option>
                          <option value="revoke">Force revoke</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
