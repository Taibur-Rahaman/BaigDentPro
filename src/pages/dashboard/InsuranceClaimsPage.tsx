import React from 'react';
import { useProductModuleScaffold } from '@/hooks/view/useProductModuleScaffold';
import { ProductModulePlaceholder } from '@/pages/dashboard/ProductModulePlaceholder';

export const InsuranceClaimsPage: React.FC = () => {
  const { rows, reload } = useProductModuleScaffold('insurance');
  return (
    <ProductModulePlaceholder
      moduleKey="insurance"
      title="Insurance & claims"
      description="Payer eligibility, claims submission, and ERA reconciliation (stub)."
      rows={rows}
      onReload={reload}
    />
  );
};
