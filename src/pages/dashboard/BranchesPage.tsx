import React, { useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { useAuth } from '@/hooks/useAuth';
import { useBranchesDashboardView } from '@/hooks/view/useBranchesDashboardView';

export const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'CLINIC_ADMIN' || user?.role === 'SUPER_ADMIN';
  const { rows, loading, error, saving, reload, createBranch, removeBranch, clearError } = useBranchesDashboardView();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    clearError();
    const ok = await createBranch(name, address);
    if (ok) {
      setName('');
      setAddress('');
    }
  };

  const onRemove = async (id: string) => {
    if (!window.confirm('Delete this branch? Users assigned to it will be unassigned from the branch.')) return;
    clearError();
    await removeBranch(id);
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Branch management</h1>
        <p className="tenant-page-lead">Clinic branches via <code>/api/clinic/branches</code>. New branches require a plan that allows multi-branch.</p>
      </div>
      {error ? <ApiError message={error} title="Request failed" onRetry={() => void reload()} /> : null}
      {canManage ? (
        <form className="tenant-card" onSubmit={(e) => void onCreate(e)} style={{ marginBottom: '1.25rem' }}>
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
                      <button type="button" className="neo-btn neo-btn-secondary neo-btn-sm" onClick={() => void onRemove(b.id)}>
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
