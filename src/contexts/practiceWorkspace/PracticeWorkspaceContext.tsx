import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { AppointmentScheduleFilter } from '@/hooks/view/useAppointmentsScheduleView';
import type { BillingInvoiceFilter } from '@/hooks/view/useBillingWorkspaceView';
import { PRACTICE_TAB_TO_NAV } from '@/hooks/view/practiceWorkspaceShared';
import {
  NAV_TO_PRACTICE_PATH,
  PRACTICE_PATH_TO_NAV,
  practiceWorkspaceHref,
  type PracticeNavSection,
} from '@/pages/practice/practiceNav';

export type PracticeWorkspaceFilters = {
  billingInvoiceFilter: BillingInvoiceFilter;
  appointmentScheduleFilter: AppointmentScheduleFilter;
  patientSearchQuery: string;
};

const defaultFilters = (): PracticeWorkspaceFilters => ({
  billingInvoiceFilter: 'all',
  appointmentScheduleFilter: 'upcoming',
  patientSearchQuery: '',
});

export type SetPracticeActiveTabOptions = {
  /** When false, only updates tab state (e.g. patient-detail on /patients). Default true when a route segment exists. */
  navigate?: boolean;
};

type RefreshFn = (() => void | Promise<void>) | null;

type PracticeWorkspaceContextValue = {
  activeTab: PracticeNavSection;
  setActiveTab: (tab: PracticeNavSection, opts?: SetPracticeActiveTabOptions) => void;
  setAuxiliaryTab: (tab: PracticeNavSection) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: Dispatch<SetStateAction<string | null>>;
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: Dispatch<SetStateAction<string | null>>;
  filters: PracticeWorkspaceFilters;
  setFilters: Dispatch<SetStateAction<PracticeWorkspaceFilters>>;
  refreshWorkspace: () => Promise<void>;
  registerWorkspaceRefresh: (fn: () => void | Promise<void>) => () => void;
  /** Suppress one pathname→tab sync after programmatic navigation (patient detail on /patients). */
  skipNextUrlDerivedTabSync: () => void;
};

const PracticeWorkspaceContext = createContext<PracticeWorkspaceContextValue | null>(null);

export function PracticeWorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyTabQuery = searchParams.get('tab');
  const skipPathSyncOnce = useRef(false);
  const refreshRef = useRef<RefreshFn>(null);

  const [activeTab, setActiveTabState] = useState<PracticeNavSection>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PracticeWorkspaceFilters>(defaultFilters);

  const registerWorkspaceRefresh = useCallback((fn: () => void | Promise<void>) => {
    refreshRef.current = fn;
    return () => {
      refreshRef.current = null;
    };
  }, []);

  const refreshWorkspace = useCallback(async () => {
    await refreshRef.current?.();
  }, []);

  const skipNextUrlDerivedTabSync = useCallback(() => {
    skipPathSyncOnce.current = true;
  }, []);

  const setActiveTab = useCallback(
    (tab: PracticeNavSection, opts?: SetPracticeActiveTabOptions) => {
      const shouldNavigate = opts?.navigate !== false;
      const seg = NAV_TO_PRACTICE_PATH[tab];
      if (shouldNavigate && seg) {
        navigate(practiceWorkspaceHref(seg), { replace: true });
      }
      setActiveTabState(tab);
    },
    [navigate]
  );

  const setAuxiliaryTab = useCallback((tab: PracticeNavSection) => {
    setActiveTabState(tab);
  }, []);

  /** Legacy `?tab=` → canonical path (depend on primitive to avoid effect churn from new URLSearchParams identity). */
  useEffect(() => {
    if (!legacyTabQuery) return;
    const mapped = PRACTICE_TAB_TO_NAV[legacyTabQuery];
    const segPath = mapped ? NAV_TO_PRACTICE_PATH[mapped] : undefined;
    if (!mapped || !segPath) return;
    navigate(practiceWorkspaceHref(segPath), { replace: true });
    setSearchParams({}, { replace: true });
  }, [navigate, legacyTabQuery, setSearchParams]);

  /** URL → workspace tab (/dashboard/:segment) */
  useEffect(() => {
    if (skipPathSyncOnce.current) {
      skipPathSyncOnce.current = false;
      return;
    }
    const flat = location.pathname.match(/^\/dashboard\/([^/?]+)\/?$/);
    if (!flat) return;
    const mapped = PRACTICE_PATH_TO_NAV[flat[1]];
    if (mapped) setActiveTabState(mapped);
  }, [location.pathname]);

  const value = useMemo<PracticeWorkspaceContextValue>(
    () => ({
      activeTab,
      setActiveTab,
      setAuxiliaryTab,
      selectedPatientId,
      setSelectedPatientId,
      selectedAppointmentId,
      setSelectedAppointmentId,
      filters,
      setFilters,
      refreshWorkspace,
      registerWorkspaceRefresh,
      skipNextUrlDerivedTabSync,
    }),
    [
      activeTab,
      setActiveTab,
      setAuxiliaryTab,
      selectedPatientId,
      setSelectedPatientId,
      selectedAppointmentId,
      setSelectedAppointmentId,
      filters,
      setFilters,
      refreshWorkspace,
      registerWorkspaceRefresh,
      skipNextUrlDerivedTabSync,
    ]
  );

  return <PracticeWorkspaceContext.Provider value={value}>{children}</PracticeWorkspaceContext.Provider>;
}

export function usePracticeWorkspace(): PracticeWorkspaceContextValue {
  const ctx = useContext(PracticeWorkspaceContext);
  if (!ctx) throw new Error('usePracticeWorkspace must be used under PracticeWorkspaceProvider');
  return ctx;
}

/** Register bundle reload (`usePracticeDashboardBundle().reload`). */
export function useRegisterPracticeWorkspaceRefresh(loadData: () => void | Promise<void>): void {
  const { registerWorkspaceRefresh } = usePracticeWorkspace();
  const loadRef = useRef(loadData);
  loadRef.current = loadData;
  useLayoutEffect(() => {
    return registerWorkspaceRefresh(() => loadRef.current());
  }, [registerWorkspaceRefresh]);
}
