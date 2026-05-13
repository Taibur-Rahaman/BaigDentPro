import React from 'react';
import { useProductModuleScaffold } from '@/hooks/view/useProductModuleScaffold';
import { ProductModulePlaceholder } from '@/pages/dashboard/ProductModulePlaceholder';

export const ClinicControlPanelPage: React.FC = () => {
  const { rows, reload } = useProductModuleScaffold('clinic-control');
  return (
    <ProductModulePlaceholder
      moduleKey="clinic-control"
      title="Clinic control"
      description="Suspend users, plan changes, usage — administrative actions (stub)."
      rows={rows}
      onReload={reload}
    />
  );
};
