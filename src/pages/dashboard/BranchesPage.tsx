import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; clinicId: string; name: string; address?: string | null };

export const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'CLINIC_ADMIN' || user?.role === 'SUPER_ADMIN';
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.branches();
      setRows(res.branches || []);
    } catch (e) {
      setRows([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.clinic.createBranch({ name: name.trim(), address: address.trim() || null });
      setName('');
      setAddress('');
      await load();
    } catch (err) {
      setError(userMessageFromUnknown(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this branch? Users assigned to it will be unassigned from the branch.')) return;
    setError(null);
    try {
      await api.clinic.deleteBranch(id);
      await load();
    } catch (err) {
      setError(userMessageFromUnknown(err));
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Branch management</h1>
        <p className="tenant-page-lead">Clinic branches via <code>/api/clinic/branches</code>. New branches require a plan that allows multi-branch.</p>
      </div>
      {error ? <ApiError message={error} title="Request failed" onRetry={() => void load()} /> : null}
      {canManage ? (
        <form className="tenant-card" onSubmit={(e) => void createBranch(e)} style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add branch</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Name</span>
              <input className="neo-input" value={name} onChange={(ev) => setName(ev.target.value)} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Address (optional)</span>
              <input className="neo-input" value={address} onChange={(ev) => setAddress(ev.target.value)} />
            </label>
            <button type="submit" className="neo-btn neo-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      ) : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="tenant-card" style={{ overflow: 'auto' }}>
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address || '—'}</td>
                  {canManage ? (
                    <td>
                      <button type="button" className="neo-btn neo-btn-secondary neo-btn-sm" onClick={() => void remove(b.id)}>
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No branches yet.</p> : null}
        </div>
      )}
    </div>
  );
};
