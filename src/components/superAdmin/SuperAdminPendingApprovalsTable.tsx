import React, { useEffect, useState } from 'react';
import type { ApproveSignupPayload } from '@/lib/core/coreSuperAdminApi';
import { userMessageFromUnknown } from '@/lib/apiErrors';

/** Draft row keeps `role` required for form state (API allows optional role on payload). */
type ApprovalRole = NonNullable<ApproveSignupPayload['role']>;
type ApprovalDraft = ApproveSignupPayload & { role: ApprovalRole };

const APPROVAL_ROLE_SET = new Set<ApprovalRole>([
  'CLINIC_ADMIN',
  'CLINIC_OWNER',
  'DOCTOR',
  'STORE_MANAGER',
  'RECEPTIONIST',
  'LAB_TECH',
  'DENTAL_ASSISTANT',
]);

function coerceApprovalRole(raw: string): ApprovalRole {
  return APPROVAL_ROLE_SET.has(raw as ApprovalRole) ? (raw as ApprovalRole) : 'CLINIC_ADMIN';
}

export type PendingRow = {
  id: string;
  email?: string;
  name?: string;
  phone?: string | null;
  clinicName?: string | null;
  title?: string | null;
  degree?: string | null;
  specialization?: string | null;
  role?: string;
  createdAt?: string;
  clinic?: { id?: string; name?: string };
};

export type SuperAdminPendingApprovalsTableProps = {
  pending: PendingRow[];
  onApprove: (userId: string, payload: ApproveSignupPayload) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
  showToast: (msg: string) => void;
  showError?: (msg: string) => void;
};

function defaultDraft(p: PendingRow): ApprovalDraft {
  return {
    role: 'CLINIC_ADMIN',
    title: p.title ?? '',
    degree: p.degree ?? '',
    specialization: p.specialization ?? '',
    professionalVerified: false,
    catalogPlanName: undefined,
  };
}

export const SuperAdminPendingApprovalsTable: React.FC<SuperAdminPendingApprovalsTableProps> = ({
  pending,
  onApprove,
  onReject,
  showToast,
  showError,
}) => {
  const notifyErr = showError ?? showToast;
  const [draftById, setDraftById] = useState<Record<string, ApprovalDraft>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    setDraftById((prev): Record<string, ApprovalDraft> => {
      const next: Record<string, ApprovalDraft> = { ...prev };
      for (const p of pending) {
        if (!next[p.id]) next[p.id] = defaultDraft(p);
      }
      for (const k of Object.keys(next)) {
        if (!pending.some((x) => x.id === k)) delete next[k];
      }
      return next;
    });
  }, [pending]);

  if (pending.length === 0) {
    return <p className="empty-state" style={{ padding: 24 }}>No pending registrations.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name / Email</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Clinic</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Requested</th>
            <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pending.map((p) => {
            const d = draftById[p.id] ?? defaultDraft(p);
            return (
              <React.Fragment key={p.id}>
                <tr>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--neo-text-muted)' }}>{p.email}</div>
                    {p.phone ? <div style={{ fontSize: 12 }}>{p.phone}</div> : null}
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    {p.clinic?.name || p.clinicName || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, verticalAlign: 'top' }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ marginRight: 8 }}
                      disabled={busyUserId !== null}
                      aria-busy={busyUserId === p.id}
                      onClick={async () => {
                        setBusyUserId(p.id);
                        try {
                          const payload: ApproveSignupPayload = {
                            role: d.role,
                            title: d.title?.trim() ? d.title.trim() : null,
                            degree: d.degree?.trim() ? d.degree.trim() : null,
                            specialization: d.specialization?.trim() ? d.specialization.trim() : null,
                            ...(d.professionalVerified ? { professionalVerified: true } : {}),
                            ...(d.catalogPlanName ? { catalogPlanName: d.catalogPlanName } : {}),
                          };
                          await onApprove(p.id, payload);
                        } catch (e: unknown) {
                          notifyErr(userMessageFromUnknown(e));
                          if (import.meta.env.DEV) console.warn('[pending-signups] approve failed', p.id, e);
                        } finally {
                          setBusyUserId(null);
                        }
                      }}
                    >
                      {busyUserId === p.id ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={busyUserId !== null}
                      aria-busy={busyUserId === p.id}
                      onClick={async () => {
                        if (!window.confirm(`Reject and delete registration for ${p.email}? The clinic will be removed if empty.`)) return;
                        setBusyUserId(p.id);
                        try {
                          await onReject(p.id);
                        } catch (e: unknown) {
                          notifyErr(userMessageFromUnknown(e));
                          if (import.meta.env.DEV) console.warn('[pending-signups] reject failed', p.id, e);
                        } finally {
                          setBusyUserId(null);
                        }
                      }}
                    >
                      {busyUserId === p.id ? 'Working…' : 'Reject'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ padding: '0 12px 16px', background: 'var(--surface, rgba(0,0,0,0.02))' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: 10,
                        alignItems: 'end',
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--neo-text-muted)' }}>Role</span>
                        <select
                          className="neo-input"
                          value={d.role}
                          onChange={(e) =>
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: { ...d, role: coerceApprovalRole(e.target.value) },
                            }))
                          }
                        >
                          <option value="CLINIC_ADMIN">Clinic admin</option>
                          <option value="CLINIC_OWNER">Clinic owner</option>
                          <option value="DOCTOR">Doctor</option>
                          <option value="STORE_MANAGER">Store manager (shop)</option>
                          <option value="RECEPTIONIST">Reception</option>
                          <option value="LAB_TECH">Lab tech</option>
                          <option value="DENTAL_ASSISTANT">Dental assistant</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--neo-text-muted)' }}>Catalog plan</span>
                        <select
                          className="neo-input"
                          value={d.catalogPlanName ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: {
                                ...d,
                                catalogPlanName: v ? (v as NonNullable<ApproveSignupPayload['catalogPlanName']>) : undefined,
                              },
                            }));
                          }}
                        >
                          <option value="">Keep signup default (FREE)</option>
                          <option value="FREE">FREE</option>
                          <option value="PLATINUM">PLATINUM</option>
                          <option value="PREMIUM">PREMIUM</option>
                          <option value="LUXURY">LUXURY</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--neo-text-muted)' }}>Title</span>
                        <input
                          className="neo-input"
                          value={d.title ?? ''}
                          placeholder="Dr., Prof."
                          maxLength={80}
                          onChange={(e) =>
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: { ...d, title: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--neo-text-muted)' }}>Degree</span>
                        <input
                          className="neo-input"
                          value={d.degree ?? ''}
                          placeholder="BDS, DDS…"
                          maxLength={200}
                          list={`degree-hints-${p.id}`}
                          onChange={(e) =>
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: { ...d, degree: e.target.value },
                            }))
                          }
                        />
                        <datalist id={`degree-hints-${p.id}`}>
                          {['BDS', 'DDS', 'FCPS', 'MS', 'MDS'].map((x) => (
                            <option key={x} value={x} />
                          ))}
                        </datalist>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--neo-text-muted)' }}>Specialization</span>
                        <input
                          className="neo-input"
                          value={d.specialization ?? ''}
                          placeholder="e.g. Dental surgeon"
                          maxLength={200}
                          onChange={(e) =>
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: { ...d, specialization: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingBottom: 4 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(d.professionalVerified)}
                          onChange={(e) =>
                            setDraftById((prev): Record<string, ApprovalDraft> => ({
                              ...prev,
                              [p.id]: { ...d, professionalVerified: e.target.checked },
                            }))
                          }
                        />
                        Verified by platform (locks self-service edits)
                      </label>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
