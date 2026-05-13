import React, { useMemo, useState } from 'react';
import type { PatientTimelineEventPayload } from '@/lib/core/corePatientsApi';

function timelineDomain(kind: string): 'workflow' | 'clinical' | 'finance' {
  if (kind === 'appointment') return 'workflow';
  if (kind === 'invoice') return 'finance';
  return 'clinical';
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'appointment':
      return 'Appointment';
    case 'treatment_plan':
      return 'Treatment plan';
    case 'treatment_record':
      return 'Treatment';
    case 'invoice':
      return 'Invoice';
    case 'prescription':
      return 'Prescription';
    case 'lab_order':
      return 'Lab';
    default:
      return kind;
  }
}

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export const PatientTimelinePanel: React.FC<{
  events: PatientTimelineEventPayload[];
  loading?: boolean;
}> = ({ events, loading }) => {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [events],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (loading) {
    return <p className="empty-state-sm patient-timeline-loading">Loading timeline…</p>;
  }

  if (sorted.length === 0) {
    return (
      <p className="empty-state-sm patient-timeline-empty">
        No timeline events yet for this patient.
      </p>
    );
  }

  return (
    <ul className="patient-timeline">
      {sorted.map((ev) => {
        const domain = timelineDomain(ev.kind);
        const key = `${ev.kind}:${ev.id}`;
        const expanded = openKey === key;
        return (
          <li key={key} className={`patient-timeline-item patient-timeline-item--${domain}`}>
            <button
              type="button"
              className="patient-timeline-rowhead"
              onClick={() => setOpenKey(expanded ? null : key)}
              aria-expanded={expanded}
            >
              <span className="patient-timeline-dot" aria-hidden />
              <span className="patient-timeline-meta">
                <span className="patient-timeline-date">{formatAt(ev.at)}</span>
                <span className="patient-timeline-kind">{kindLabel(ev.kind)}</span>
              </span>
              <span className="patient-timeline-chevron">{expanded ? '▾' : '▸'}</span>
            </button>
            <div className="patient-timeline-title">{ev.title}</div>
            {ev.summary ? (
              <div className={`patient-timeline-summary ${expanded ? '' : 'patient-timeline-clamp'}`}>
                {ev.summary}
              </div>
            ) : null}
            {expanded ? (
              <div className="patient-timeline-detail">
                {ev.status ? (
                  <div>
                    <strong>Status:</strong> {ev.status}
                  </div>
                ) : null}
                <div>
                  <strong>When:</strong> {formatAt(ev.at)}
                </div>
                <div>
                  <strong>Type:</strong> {kindLabel(ev.kind)}
                </div>
                {ev.summary ? (
                  <div>
                    <strong>Details:</strong> {ev.summary}
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};
