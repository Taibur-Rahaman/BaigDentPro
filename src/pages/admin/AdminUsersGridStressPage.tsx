import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AdminUserRow } from '@/types/adminPanel';
import { ADMIN_USER_ROW_HEIGHT_STANDARD } from '@/features/admin/users/adminUserGridMetrics';
import '@/styles/admin-tokens.css';

function buildMockUsers(count: number): AdminUserRow[] {
  const roles = ['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'CLINIC_OWNER'] as const;
  const seed = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `stress-${seed}-${i}`,
    email: `user${i}@stress.local`,
    name: `Stress User ${i}`,
    role: roles[i % roles.length]!,
    phone: null,
    clinicName: `Clinic ${i % 200}`,
    clinicId: `clinic-${i % 200}`,
    isActive: true,
    isApproved: true,
    accountStatus: 'ACTIVE',
    createdAt: new Date().toISOString(),
    clinic: { id: `clinic-${i % 200}`, name: `Clinic ${i % 200}`, plan: 'PRO', isActive: true },
  }));
}

function useApproxFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let id = 0;
    const tick = (t: number) => {
      frames++;
      if (t - last >= 650) {
        setFps(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return fps;
}

/**
 * Development-only stress harness: pure client mock + TanStack Virtual (no API).
 * Open `/dashboard/admin/users/stress?n=50000` as SUPER_ADMIN.
 */
export const AdminUsersGridStressPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const nRaw = Number.parseInt(searchParams.get('n') || '1000', 10);
  const n = Math.min(50_000, Math.max(1, Number.isFinite(nRaw) ? nRaw : 1000));

  const parentRef = useRef<HTMLDivElement>(null);
  const fps = useApproxFps();

  const rows = useMemo(() => buildMockUsers(n), [n]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ADMIN_USER_ROW_HEIGHT_STANDARD,
    overscan: 12,
    getItemKey: (index: number) => rows[index]?.id ?? index,
  });

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Grid stress harness (dev)</h1>
        <p className="tenant-page-lead">
          Mock data only — verifies virtualization scrolling performance. Adjust count with <code>?n=</code> (max 50k).
        </p>
        <div className="admin-stress-hud" role="status">
          <span>
            Rows: <strong>{n.toLocaleString()}</strong>
          </span>
          <span>
            ~FPS: <strong>{fps}</strong>
          </span>
          <span>
            Virtual window: <strong>{rowVirtualizer.getVirtualItems().length}</strong> DOM rows
          </span>
        </div>
        <label className="admin-stress-n-label">
          Mock count
          <input
            type="number"
            className="neo-input"
            min={1}
            max={50_000}
            value={n}
            onChange={(e) => {
              const next = Math.min(50_000, Math.max(1, Number.parseInt(e.target.value, 10) || 1));
              setSearchParams(
                (prev) => {
                  const x = new URLSearchParams(prev);
                  x.set('n', String(next));
                  return x;
                },
                { replace: true },
              );
            }}
          />
        </label>
      </div>

      <div className="admin-user-grid-shell">
        <div
          className="admin-user-colhead"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,1.2fr)',
            gap: 12,
          }}
        >
          <span className="admin-user-colhead-strong">User</span>
          <span className="admin-user-colhead-strong">Role &amp; clinic</span>
        </div>
        <div ref={parentRef} className="admin-user-scroll" tabIndex={0} role="grid" aria-label="Stress mock grid">
          <div className="admin-user-virtual-inner" style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((vr) => {
              const row = rows[vr.index];
              if (!row) return null;
              return (
                <div
                  key={vr.key}
                  className="admin-user-virtual-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    minHeight: ADMIN_USER_ROW_HEIGHT_STANDARD,
                    transform: `translateY(${vr.start}px)`,
                  }}
                >
                  <div
                    className="admin-user-row-card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,1.2fr)',
                      gap: 12,
                      alignItems: 'start',
                      minHeight: ADMIN_USER_ROW_HEIGHT_STANDARD,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--neo-text-muted)' }}>{row.email}</div>
                      <code style={{ fontSize: 11, color: '#94a3b8' }}>{row.id}</code>
                    </div>
                    <div style={{ fontSize: 14 }}>
                      <strong>{row.role}</strong>
                      <div style={{ marginTop: 6 }}>{row.clinic?.name}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
