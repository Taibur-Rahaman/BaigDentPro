import React from 'react';
import { useProductModuleScaffold } from '@/hooks/view/useProductModuleScaffold';
import { ProductModulePlaceholder } from '@/pages/dashboard/ProductModulePlaceholder';

export const ClinicInventoryPage: React.FC = () => {
  const { rows, reload } = useProductModuleScaffold('inventory');
  return (
    <ProductModulePlaceholder
      moduleKey="inventory"
      title="Clinic inventory"
      description="Consumables, reorder points, and vendor catalog (stub; not SaaS shop)."
      rows={rows}
      onReload={reload}
    />
  );
};
