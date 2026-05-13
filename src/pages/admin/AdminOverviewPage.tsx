import React, { useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { useAdminOverviewView } from '@/hooks/view/useAdminOverviewView';
import api from '@/api';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { setCachedSiteLogoUrl } from '@/lib/siteBranding';
import { useAuth } from '@/hooks/useAuth';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="dashboard-card tenant-card" style={{ minHeight: 120 }}>
      <div className="card-header">
        <h3>{label}</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--neo-text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

export const AdminOverviewPage: React.FC = () => {
  const { stats, loading, error, reload } = useAdminOverviewView();
  const { user } = useAuth();
  const { showSuccess, showError } = useToastBridge();
  const [masterLogo, setMasterLogo] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [platformPulse, setPlatformPulse] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    void api.superAdmin
      .stats()
      .then((s) => {
        setPlatformPulse({
          totalClinics: s.totalClinics,
          totalPatients: s.totalPatients,
          totalAppointments: s.totalAppointments,
          totalPrescriptions: s.totalPrescriptions,
          totalRevenue: s.totalRevenue,
          activityLogCount: s.activityLogCount,
        });
      })
      .catch(() => setPlatformPulse(null));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    void api.admin
      .masterLogo()
      .then((data) => {
        setMasterLogo(data.logo || '');
        setCachedSiteLogoUrl(data.logo || '');
      })
      .catch(() => {});
  }, [user?.role]);

  const toSquarePngDataUrl = async (file: File): Promise<string> => {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const src = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(src);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(src);
        reject(new Error('Could not read image'));
      };
      image.src = src;
    });
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    const srcW = source.naturalWidth;
    const srcH = source.naturalHeight;
    const crop = Math.min(srcW, srcH);
    const sx = Math.floor((srcW - crop) / 2);
    const sy = Math.floor((srcH - crop) / 2);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, sx, sy, crop, crop, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  };

  const saveMasterLogo = async (dataUrl: string) => {
    setLogoBusy(true);
    try {
      const saved = await api.admin.updateMasterLogo(dataUrl);
      const logo = saved.logo || '';
      setMasterLogo(logo);
      setCachedSiteLogoUrl(logo);
      showSuccess('Master logo updated for the full site.');
    } catch (error: unknown) {
      const message = userMessageFromUnknown(error);
      showError(message);
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Executive dashboard</h1>
        <p className="tenant-page-lead">
          Operational pulse from <code>/api/admin/stats</code>. SUPER_ADMIN rows add a cross-tenant snapshot from{' '}
          <code>/api/super-admin/stats</code>.
        </p>
      </div>
      {error ? <ApiError message={error} title="Could not load stats" onRetry={() => void reload()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Clinics" value={stats.clinics} />
            <StatCard label="SaaS orders" value={stats.saasOrders} />
            <StatCard label="Catalog products" value={stats.saasProducts} />
            <StatCard label="Subscriptions" value={stats.subscriptions} />
            <StatCard label="Audit entries (7d)" value={stats.auditLogs7d} />
          </div>
          {user?.role === 'SUPER_ADMIN' && platformPulse ? (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Platform analytics</h3>
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                <StatCard label="Practices (global)" value={platformPulse.totalClinics} />
                <StatCard label="Patients (global)" value={platformPulse.totalPatients} />
                <StatCard label="Appointments" value={platformPulse.totalAppointments} />
                <StatCard label="Prescriptions" value={platformPulse.totalPrescriptions} />
                <StatCard label="Tracked revenue (sample)" value={platformPulse.totalRevenue} />
                <StatCard label="Activity logs" value={platformPulse.activityLogCount} />
              </div>
            </div>
          ) : null}
          {user?.role === 'SUPER_ADMIN' ? (
            <section className="tenant-card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 8px' }}>Master Site Logo</h3>
              <p style={{ margin: '0 0 12px', color: '#64748b' }}>
                Upload once to update the brand logo globally. Image is auto-cropped to 1:1 and resized to 512x512.
              </p>
              {masterLogo ? (
                <img
                  src={masterLogo}
                  alt="Master site logo preview"
                  style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              ) : null}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="neo-btn neo-btn-secondary" style={{ cursor: logoBusy ? 'wait' : 'pointer' }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={logoBusy}
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void toSquarePngDataUrl(file).then(saveMasterLogo).catch((error: unknown) => {
                        showError(userMessageFromUnknown(error));
                      });
                      e.currentTarget.value = '';
                    }}
                  />
                  {logoBusy ? 'Processing...' : 'Upload & apply logo'}
                </label>
                <button
                  type="button"
                  className="neo-btn neo-btn-secondary"
                  disabled={logoBusy || !masterLogo}
                  onClick={() => void saveMasterLogo('')}
                >
                  Clear master logo
                </button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
