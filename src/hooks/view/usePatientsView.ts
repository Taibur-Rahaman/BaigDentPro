import { useState, type Dispatch, type SetStateAction } from 'react';
import type { PatientViewModel } from '@/viewModels';

export interface PatientsView {
  patients: PatientViewModel[];
  setPatients: Dispatch<SetStateAction<PatientViewModel[]>>;
}

export function usePatientsView(): PatientsView {
  const [patients, setPatients] = useState<PatientViewModel[]>([]);
  return { patients, setPatients };
}

/** Practice shell: searchable / sortable directory (composed with bundle reload). */
export { usePatientsDirectoryView } from './usePatientsDirectoryView';
