import { useMemo, useState } from 'react';
import { DRUG_DATABASE } from '@/hooks/view/practiceWorkspaceShared';

/** Embedded drug-database panel (search + filter only). */
export function usePracticePrescriptionsDomain() {
  const [drugSearch, setDrugSearch] = useState('');
  const filteredDrugs = useMemo(() => {
    if (!drugSearch) return DRUG_DATABASE;
    const q = drugSearch.toLowerCase();
    return DRUG_DATABASE.filter(
      (d) => d.brand.toLowerCase().includes(q) || d.generic.toLowerCase().includes(q) || d.company.toLowerCase().includes(q),
    );
  }, [drugSearch]);

  return { drugSearch, setDrugSearch, filteredDrugs };
}
