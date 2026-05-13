import React from 'react';
import { useProductModuleScaffold } from '@/hooks/view/useProductModuleScaffold';
import { ProductModulePlaceholder } from '@/pages/dashboard/ProductModulePlaceholder';

export const StaffSchedulePage: React.FC = () => {
  const { rows, reload } = useProductModuleScaffold('staff-schedule');
  return (
    <ProductModulePlaceholder
      moduleKey="staff-schedule"
      title="Staff scheduling"
      description="Shifts, coverage, and time-off — scaffold (stub)."
      rows={rows}
      onReload={reload}
    />
  );
};
