import React from 'react';
import { useProductModuleScaffold } from '@/hooks/view/useProductModuleScaffold';
import { ProductModulePlaceholder } from '@/pages/dashboard/ProductModulePlaceholder';

export const PatientPortalSettingsPage: React.FC = () => {
  const { rows, reload } = useProductModuleScaffold('patient-portal');
  return (
    <ProductModulePlaceholder
      moduleKey="patient-portal"
      title="Patient portal"
      description="Online booking, payments, and history — tenant-facing module (stub)."
      rows={rows}
      onReload={reload}
    />
  );
};
