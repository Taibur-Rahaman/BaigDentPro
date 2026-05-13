import { useMemo, useState } from 'react';
import type { ScaffoldListRow } from '@/viewModels/productModules.viewModel';

export type ScaffoldModuleState = {
  loading: boolean;
  error: string | null;
  rows: ScaffoldListRow[];
  reload: () => void;
};

/** Stub orchestration until core endpoints ship */
export function useProductModuleScaffold(moduleKey: string): ScaffoldModuleState {
  const [tick, setTick] = useState(0);
  const rows = useMemo<ScaffoldListRow[]>(() => {
    void tick;
    return [
      { id: `${moduleKey}-1`, label: 'Sample row A', status: 'Pending' },
      { id: `${moduleKey}-2`, label: 'Sample row B', status: 'Ready' },
    ];
  }, [moduleKey, tick]);
  return {
    loading: false,
    error: null,
    rows,
    reload: () => setTick((n) => n + 1),
  };
}
