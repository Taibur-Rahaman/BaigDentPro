import React from 'react';
import type { DayScheduleGrid } from '@/types/calendarEnterprise';
import type { CalendarBlockChipVM } from '@/viewModels/calendar.viewModel';
import type { WeekGridRowVM } from '@/viewModels/calendar.viewModel';

type Props = {
  grid: DayScheduleGrid;
  weekGridLabels: WeekGridRowVM[];
  chipsByColumn: Map<string, CalendarBlockChipVM[]>;
  dragBlockId: string | null;
  /** Called when a dragged block id is dropped on slot (slotIndex within day for that column) */
  onDropBlock: (blockId: string, columnId: string, slotIndex: number) => void;
  onDragStartBlock: (blockId: string) => void;
  onDragEndBlock: () => void;
};

/**
 * Presentation-only Dentrix-style column grid — scheduling math lives in core + hooks.
 */
export const OperatoryWeekGrid: React.FC<Props> = ({
  grid,
  weekGridLabels,
  chipsByColumn,
  dragBlockId,
  onDropBlock,
  onDragStartBlock,
  onDragEndBlock,
}) => {
  const slotMinutes = grid.slotMinutes;
  const slotsPerHour = Math.max(1, Math.floor(60 / slotMinutes));
  const slotsCount = weekGridLabels.length * slotsPerHour;
  const cellPx = 14;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="operatory-calendar" role="region" aria-label="Operatory week calendar">
      <div className="operatory-calendar-inner">
        <div className="operatory-calendar-time gutter">
          <div className="operatory-calendar-corner">Time</div>
          {weekGridLabels.map((row) => (
            <div key={row.label} className="operatory-calendar-time-slot">
              {row.label}
            </div>
          ))}
        </div>

        {grid.columns.map((col) => (
          <div key={col.operatoryId} className="operatory-calendar-col">
            <div className="operatory-calendar-head">{col.operatoryLabel}</div>
            <div className="operatory-calendar-cells" style={{ minHeight: slotsCount * cellPx }}>
              {Array.from({ length: slotsCount }).map((_, idx) => (
                <div
                  key={idx}
                  className={`operatory-calendar-cell${dragBlockId ? ' operatory-calendar-cell-droppable' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    const bid = e.dataTransfer.getData('application/x-baigdent-block');
                    if (!bid || !dragBlockId) return;
                    onDropBlock(bid, col.operatoryId, idx);
                  }}
                />
              ))}
              <div className="operatory-calendar-blocks-layer">
                {(chipsByColumn.get(col.operatoryId) ?? []).map((chip) => (
                  <div
                    key={chip.block.id}
                    draggable
                    role="button"
                    tabIndex={0}
                    onDragStart={(e) => {
                      onDragStartBlock(chip.block.id);
                      e.dataTransfer.setData('application/x-baigdent-block', chip.block.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => onDragEndBlock()}
                    className={`operatory-block-chip${chip.conflict ? ' operatory-block-chip--conflict' : ''}${chip.block.isTentative ? ' operatory-block-chip--tentative' : ''}`}
                    style={{
                      top: `${chip.topPercent}%`,
                      height: `${chip.heightPercent}%`,
                    }}
                    title={`${chip.block.patientLabel}`}
                  >
                    <div className="operatory-block-chip-title">{chip.block.patientLabel}</div>
                    <div className="operatory-block-chip-sub">
                      {(chip.block.procedureCodes ?? []).slice(0, 2).join(', ') || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
