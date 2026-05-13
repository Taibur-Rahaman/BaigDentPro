import React, { useMemo, useState } from 'react';
import { OperatoryWeekGrid } from '@/components/calendar/OperatoryWeekGrid';
import { FeatureUpgradeModal } from '@/components/saas/FeatureUpgradeModal';
import { useEnterpriseFeatureGate } from '@/hooks/view/useEnterpriseFeatureGate';
import { useCalendarView } from '@/hooks/view/useCalendarView';
import { useOperatoryView } from '@/hooks/view/useOperatoryView';
import { calendarBlocksToChips, type CalendarBlockChipVM } from '@/viewModels/calendar.viewModel';

export const OperationsCalendarPage: React.FC = () => {
  const gate = useEnterpriseFeatureGate('calendar.operatory');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const op = useOperatoryView();
  const cal = useCalendarView({
    clinicId: op.clinicId,
    operatories: op.operatories,
    availabilityRules: op.availabilityRules,
  });

  const primaryGrid = cal.daySchedules[0];
  const dayStart = primaryGrid?.dayStartEpochMs ?? Date.now();
  const dayEnd = primaryGrid?.dayEndEpochMs ?? dayStart + 86400000;

  const chipsByColumn = useMemo(() => {
    const map = new Map<string, CalendarBlockChipVM[]>();
    if (!primaryGrid) return map;
    for (const col of primaryGrid.columns) {
      const chips = col.blocks.map((b) => calendarBlocksToChips(b, dayStart, dayEnd, cal.conflictBlockIds));
      map.set(col.operatoryId, chips);
    }
    return map;
  }, [cal.conflictBlockIds, dayEnd, dayStart, primaryGrid]);

  const dayLabel = useMemo(() => {
    const d = new Date(dayStart);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }, [dayStart]);

  if (!primaryGrid) return null;

  if (!gate.allowed) {
    return (
      <div className="tenant-page">
        <div className="tenant-page-header">
          <h1>Operatory schedule</h1>
          <p className="tenant-page-lead">Upgrade to enable operatory scheduling in this tenant.</p>
          <button type="button" className="neo-btn neo-btn-primary" onClick={() => setUpgradeOpen(true)}>
            View upgrade options
          </button>
        </div>
        <FeatureUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          featureLabel="Operatory scheduling"
        />
      </div>
    );
  }

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Operatory schedule</h1>
        <p className="tenant-page-lead">{dayLabel} · chair columns · drag blocks to reschedule</p>
      </div>

      <div className="calendar-toolbar">
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => cal.setWeekOffset((w) => w - 1)}>
          ← Prev week
        </button>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => cal.setWeekOffset(0)}>
          This week
        </button>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => cal.setWeekOffset((w) => w + 1)}>
          Next week →
        </button>
        <label>
          Focus operatory
          <select
            value={cal.selectedOperatoryId ?? ''}
            onChange={(e) => cal.setSelectedOperatoryId(e.target.value || null)}
            style={{ marginLeft: 8 }}
          >
            <option value="">All</option>
            {op.operatories.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ?? o.name}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: 13, color: 'var(--neo-text-muted)' }}>
          Tentative blocks: drag to commit — engine validates overlaps in core.
        </span>
      </div>

      {cal.globalConflicts.length > 0 ? (
        <div className="calendar-conflict-bar" role="status">
          <strong>{cal.globalConflicts.length} scheduling conflict(s).</strong>{' '}
          {cal.globalConflicts[0]?.message}
          {cal.globalConflicts.length > 1 ? ' (and more)' : ''}
        </div>
      ) : null}

      <OperatoryWeekGrid
        grid={primaryGrid}
        weekGridLabels={cal.weekGridLabels}
        chipsByColumn={chipsByColumn}
        dragBlockId={cal.dragBlockId}
        onDragStartBlock={cal.setDragBlockId}
        onDragEndBlock={() => cal.setDragBlockId(null)}
        onDropBlock={(blockId, columnId, slotIndex) => {
          const d = new Date(cal.displayedDays[0] ?? cal.weekStart);
          d.setHours(0, 0, 0, 0);
          void cal.proposeMove(blockId, d.getTime(), columnId, slotIndex);
          cal.setDragBlockId(null);
        }}
      />

      <section style={{ marginTop: 22, fontSize: 13, color: 'var(--neo-text-muted)' }}>
        <p>
          Availability preview (selected operatory · 15‑min slots booked vs free) —{' '}
          {cal.availabilityPreview.filter((s) => s.status === 'BOOKED').length} booked / {cal.availabilityPreview.length}{' '}
          slices.
        </p>
      </section>
    </div>
  );
};
