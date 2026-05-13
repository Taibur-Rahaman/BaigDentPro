import { useMemo } from 'react';
import type { PrescriptionViewModel } from '@/viewModels';

/** Prescription directory for practice shell — sorted + optional aggregates (VM in / VM out). */
export function usePrescriptionsWorkspaceView(prescriptions: PrescriptionViewModel[]) {
  return useMemo(() => {
    const sorted = [...prescriptions].sort((a, b) => {
      const dc = (b.date || '').localeCompare(a.date || '');
      return dc !== 0 ? dc : (b.id || '').localeCompare(a.id || '');
    });
    const totalDrugsListed = sorted.reduce((n, rx) => n + rx.drugs.length, 0);
    return {
      prescriptionsSorted: sorted,
      totalListed: sorted.length,
      totalDrugsListed,
    };
  }, [prescriptions]);
}
