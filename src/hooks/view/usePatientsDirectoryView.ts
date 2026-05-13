import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import api from '@/api';
import { mapPatientToViewModel, type PatientViewModel } from '@/viewModels';

export type PatientSortKey = 'name' | 'regNo' | 'phone' | 'createdAt';

type NavLike = string;

/** Patient list search, sort, and paging for the practice shell (VM-only surface to UI). */
export function usePatientsDirectoryView(opts: {
  token: string | null | undefined;
  activeNav: NavLike;
  patients: PatientViewModel[];
  /** When set, search string is workspace-controlled (e.g. `PracticeWorkspaceContext.filters`). */
  searchQuery?: string;
  setSearchQuery?: Dispatch<SetStateAction<string>>;
}) {
  const { token, activeNav, patients } = opts;
  const [internalSearch, setInternalSearch] = useState('');
  const searchQuery = opts.searchQuery ?? internalSearch;
  const setSearchQuery = opts.setSearchQuery ?? setInternalSearch;
  const [patientsSearchOverride, setPatientsSearchOverride] = useState<PatientViewModel[] | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSortKey, setPatientSortKey] = useState<PatientSortKey>('name');
  const [patientSortDir, setPatientSortDir] = useState<'asc' | 'desc'>('asc');
  const [patientListPage, setPatientListPage] = useState(1);
  const [patientListPageSize, setPatientListPageSize] = useState(25);

  const filteredPatients = useMemo(() => {
    if (activeNav === 'patients' && patientsSearchOverride !== null && searchQuery.trim()) {
      return patientsSearchOverride;
    }
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.regNo?.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [patients, searchQuery, patientsSearchOverride, activeNav]);

  useEffect(() => {
    if (activeNav !== 'patients') {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    if (!token) {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setPatientsSearchOverride(null);
      setPatientSearchLoading(false);
      return;
    }
    setPatientSearchLoading(true);
    const t = window.setTimeout(() => {
      api.patients
        .list({ search: q, limit: 200 })
        .then((res) => {
          setPatientsSearchOverride(res.patients.map(mapPatientToViewModel));
        })
        .catch(() => setPatientsSearchOverride(null))
        .finally(() => setPatientSearchLoading(false));
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchQuery, activeNav, token]);

  const patientsSortedForList = useMemo(() => {
    const list = [...filteredPatients];
    const mul = patientSortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (patientSortKey) {
        case 'name':
          return mul * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'regNo':
          return mul * (a.regNo || '').localeCompare(b.regNo || '', undefined, { numeric: true });
        case 'phone':
          return mul * a.phone.localeCompare(b.phone);
        case 'createdAt':
          return mul * (a.createdAt - b.createdAt);
        default:
          return 0;
      }
    });
    return list;
  }, [filteredPatients, patientSortKey, patientSortDir]);

  const patientListTotalPages = Math.max(1, Math.ceil(patientsSortedForList.length / patientListPageSize));

  const patientsPageSlice = useMemo(() => {
    const start = (patientListPage - 1) * patientListPageSize;
    return patientsSortedForList.slice(start, start + patientListPageSize);
  }, [patientsSortedForList, patientListPage, patientListPageSize]);

  useEffect(() => {
    setPatientListPage(1);
  }, [searchQuery, patientSortKey, patientSortDir]);

  useEffect(() => {
    if (patientListPage > patientListTotalPages) {
      setPatientListPage(patientListTotalPages);
    }
  }, [patientListPage, patientListTotalPages]);

  const togglePatientSort = (key: PatientSortKey) => {
    setPatientSortKey((prevKey) => {
      if (prevKey === key) {
        setPatientSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setPatientSortDir('asc');
      return key;
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    patientSearchLoading,
    patientSortKey,
    patientSortDir,
    togglePatientSort,
    patientListPage,
    setPatientListPage,
    patientListPageSize,
    setPatientListPageSize,
    filteredPatients,
    patientsSortedForList,
    patientListTotalPages,
    patientsPageSlice,
  };
}
