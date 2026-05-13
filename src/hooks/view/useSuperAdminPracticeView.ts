import { useEffect, useState } from 'react';
import api from '@/api';
import type { SuperAdminStats } from '@/hooks/view/apiReturnTypes';

export type SuperAdminTabId =
  | 'overview'
  | 'approvals'
  | 'capabilities'
  | 'clinics'
  | 'doctor-control'
  | 'patient-control'
  | 'prescription-control'
  | 'revenue'
  | 'utilization'
  | 'logs';

/** Super-admin panel data loads (practice shell) — orchestration-only; VMs use `any[]` rows from API. */
export function useSuperAdminPracticeView(opts: {
  enabled: boolean;
  activeNavIsSuperAdmin: boolean;
  token: string | null | undefined;
  superAdminTab: SuperAdminTabId;
  superAdminDoctorSearch: string;
  superAdminPatientSearch: string;
  onLoadError: (message: string) => void;
}) {
  const {
    enabled,
    activeNavIsSuperAdmin,
    token,
    superAdminTab,
    superAdminDoctorSearch,
    superAdminPatientSearch,
    onLoadError,
  } = opts;

  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminStats | null>(null);
  const [superAdminClinics, setSuperAdminClinics] = useState<unknown[]>([]);
  const [superAdminRevenue, setSuperAdminRevenue] = useState<unknown[]>([]);
  const [superAdminUtilization, setSuperAdminUtilization] = useState<unknown[]>([]);
  const [superAdminLogs, setSuperAdminLogs] = useState<unknown[]>([]);
  const [superAdminDoctors, setSuperAdminDoctors] = useState<unknown[]>([]);
  const [superAdminPatients, setSuperAdminPatients] = useState<unknown[]>([]);
  const [superAdminPrescriptions, setSuperAdminPrescriptions] = useState<unknown[]>([]);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminPending, setSuperAdminPending] = useState<unknown[]>([]);

  useEffect(() => {
    if (!enabled || !activeNavIsSuperAdmin || !token) return;
    let cancelled = false;
    setSuperAdminLoading(true);
    (async () => {
      try {
        const [statsRes, clinicsRes, revenueRes, utilRes, logsRes] = await Promise.all([
          api.superAdmin.stats(),
          api.superAdmin.clinics({ limit: 100 }),
          api.superAdmin.revenueByBranch(),
          api.superAdmin.chairUtilization(),
          api.superAdmin.activityLogs({ limit: 100 }),
        ]);
        if (cancelled) return;
        setSuperAdminStats(statsRes);
        setSuperAdminClinics(clinicsRes.clinics ?? []);
        setSuperAdminRevenue(revenueRes.branches ?? []);
        setSuperAdminUtilization(utilRes.utilization ?? []);
        setSuperAdminLogs(logsRes.logs ?? []);
      } catch {
        if (!cancelled) onLoadError('Failed to load super admin data');
      } finally {
        if (!cancelled) setSuperAdminLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, activeNavIsSuperAdmin, token, onLoadError]);

  useEffect(() => {
    if (!enabled || !activeNavIsSuperAdmin || !token || superAdminTab !== 'approvals') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.superAdmin.pendingSignups();
        if (!cancelled) setSuperAdminPending(res.pending ?? []);
      } catch {
        if (!cancelled) onLoadError('Failed to load pending signups');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, activeNavIsSuperAdmin, token, superAdminTab, onLoadError]);

  useEffect(() => {
    if (!enabled || !activeNavIsSuperAdmin || !token) return;
    let cancelled = false;
    (async () => {
      try {
        if (superAdminTab === 'doctor-control') {
          const res = await api.superAdmin.doctors({ search: superAdminDoctorSearch, limit: 200 });
          if (!cancelled) setSuperAdminDoctors(res.doctors ?? []);
          return;
        }
        if (superAdminTab === 'patient-control') {
          const res = await api.superAdmin.patients({ search: superAdminPatientSearch, limit: 200 });
          if (!cancelled) setSuperAdminPatients(res.patients ?? []);
          return;
        }
        if (superAdminTab === 'prescription-control') {
          const res = await api.superAdmin.prescriptions({ limit: 200 });
          if (!cancelled) setSuperAdminPrescriptions(res.prescriptions ?? []);
        }
      } catch {
        if (!cancelled) onLoadError('Failed to load super admin management data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    activeNavIsSuperAdmin,
    token,
    superAdminTab,
    superAdminDoctorSearch,
    superAdminPatientSearch,
    onLoadError,
  ]);

  return {
    superAdminStats,
    setSuperAdminStats,
    superAdminClinics,
    superAdminRevenue,
    superAdminUtilization,
    superAdminLogs,
    superAdminDoctors,
    superAdminPatients,
    superAdminPrescriptions,
    superAdminLoading,
    superAdminPending,
    setSuperAdminPending,
    setSuperAdminDoctors,
    setSuperAdminPatients,
    setSuperAdminPrescriptions,
  };
}
