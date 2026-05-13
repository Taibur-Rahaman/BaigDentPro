import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import type { ApproveSignupPayload } from '@/lib/core/coreSuperAdminApi';
import type { PracticeNavSection } from '@/pages/practice/practiceNav';
import type { SuperAdminTabId } from '@/hooks/view/useSuperAdminPracticeView';
import { useSuperAdminPracticeView } from '@/hooks/view/useSuperAdminPracticeView';

export type ClinicAdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicId?: string | null;
  clinicName?: string | null;
  isActive?: boolean;
};

export function usePracticeSuperAdminDomain(opts: {
  userRole?: string;
  currentUserId?: string;
  token: string | null | undefined;
  activeNav: PracticeNavSection;
  showToast: (msg: string) => void;
  onLoadError: (msg: string) => void;
}) {
  const { userRole, currentUserId, token, activeNav, showToast, onLoadError } = opts;

  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTabId>('overview');
  const [superAdminDoctorSearch, setSuperAdminDoctorSearch] = useState('');
  const [superAdminPatientSearch, setSuperAdminPatientSearch] = useState('');

  const {
    superAdminStats,
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
  } = useSuperAdminPracticeView({
    enabled: userRole === 'SUPER_ADMIN',
    activeNavIsSuperAdmin: activeNav === 'super-admin',
    token,
    superAdminTab,
    superAdminDoctorSearch,
    superAdminPatientSearch,
    onLoadError,
  });

  const [demoResetLoading, setDemoResetLoading] = useState(false);

  const [clinicAdminUsers, setClinicAdminUsers] = useState<ClinicAdminUserRow[]>([]);
  const [clinicAdminTotal, setClinicAdminTotal] = useState(0);
  const [clinicAdminLoading, setClinicAdminLoading] = useState(false);
  const [clinicAdminSearchInput, setClinicAdminSearchInput] = useState('');
  const [clinicAdminSearch, setClinicAdminSearch] = useState('');
  const [clinicAdminPage, setClinicAdminPage] = useState(1);
  const [adminFilterClinicId, setAdminFilterClinicId] = useState('');
  const [adminClinicOptions, setAdminClinicOptions] = useState<{ id: string; name: string }[]>([]);
  const [newStaffForm, setNewStaffForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'DOCTOR' as 'DOCTOR' | 'CLINIC_ADMIN',
    clinicId: '',
  });

  useEffect(() => {
    const t = window.setTimeout(() => setClinicAdminSearch(clinicAdminSearchInput), 400);
    return () => window.clearTimeout(t);
  }, [clinicAdminSearchInput]);

  useEffect(() => {
    setClinicAdminPage(1);
  }, [clinicAdminSearch, adminFilterClinicId]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN' && adminClinicOptions.length > 0) {
      setNewStaffForm((f) => (f.clinicId ? f : { ...f, clinicId: adminClinicOptions[0].id }));
    }
  }, [userRole, adminClinicOptions]);

  useEffect(() => {
    if (activeNav !== 'clinic-admin' || !token) return;
    if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') return;
    let cancelled = false;
    setClinicAdminLoading(true);
    void (async () => {
      try {
        if (userRole === 'SUPER_ADMIN') {
          const cres = await api.admin.clinics();
          if (!cancelled) setAdminClinicOptions(cres.clinics ?? []);
        } else if (!cancelled) {
          setAdminClinicOptions([]);
        }
        const res = await api.admin.users({
          search: clinicAdminSearch.trim() || undefined,
          page: clinicAdminPage,
          limit: 25,
          clinicId: userRole === 'SUPER_ADMIN' && adminFilterClinicId ? adminFilterClinicId : undefined,
        });
        if (cancelled) return;
        setClinicAdminUsers((res.users ?? []) as ClinicAdminUserRow[]);
        setClinicAdminTotal(res.total ?? 0);
      } catch {
        if (!cancelled) showToast('Failed to load team');
      } finally {
        if (!cancelled) setClinicAdminLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNav, adminFilterClinicId, clinicAdminPage, clinicAdminSearch, showToast, token, userRole]);

  const approvePendingSignup = useCallback(
    async (signupId: string, payload: ApproveSignupPayload = {}) => {
      await api.superAdmin.approveSignup(signupId, payload);
      showToast('Approved — user can sign in now');
      setSuperAdminPending((list) => (list as { id: string }[]).filter((x) => x.id !== signupId));
    },
    [setSuperAdminPending, showToast],
  );

  const rejectPendingSignup = useCallback(
    async (signupId: string, email?: string) => {
      await api.superAdmin.rejectSignup(signupId);
      showToast('Registration rejected');
      setSuperAdminPending((list) => (list as { id: string }[]).filter((x) => x.id !== signupId));
      void email;
    },
    [setSuperAdminPending, showToast],
  );

  const resetDemoData = useCallback(async () => {
    if (
      !window.confirm(
        'Reset all demo clinic data? This deletes transactional records for demo clinics and reseeds sample patients, appointments, prescriptions, and billing. Production clinics are not affected.',
      )
    ) {
      return;
    }
    setDemoResetLoading(true);
    try {
      const res = await api.superAdmin.demoReset();
      showToast(`Demo data reset (${res.clinicsReset ?? 0} clinic(s))`);
      window.location.reload();
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message ?? 'Demo reset failed');
      setDemoResetLoading(false);
    }
  }, [showToast]);

  const updateDoctorRow = useCallback(
    async (
      doctorId: string,
      body: {
        name: string;
        phone: string;
        clinicName: string;
        role: 'DOCTOR' | 'CLINIC_ADMIN';
        isActive: boolean;
      },
    ) => {
      const updated = await api.superAdmin.updateDoctor(doctorId, body);
      setSuperAdminDoctors((list) => (list as { id: string }[]).map((x) => (x.id === doctorId ? { ...x, ...updated } : x)));
      showToast('Doctor updated successfully');
    },
    [setSuperAdminDoctors, showToast],
  );

  const updatePatientRow = useCallback(
    async (patientId: string, body: { name: string; phone: string; age: number | null }) => {
      const updated = await api.superAdmin.updatePatient(patientId, body);
      setSuperAdminPatients((list) => (list as { id: string }[]).map((x) => (x.id === patientId ? { ...x, ...updated } : x)));
      showToast('Patient updated successfully');
    },
    [setSuperAdminPatients, showToast],
  );

  const updatePrescriptionRow = useCallback(
    async (prescriptionId: string, body: { diagnosis: string; advice: string; followUpDate: string | null }) => {
      const updated = await api.superAdmin.updatePrescription(prescriptionId, body);
      setSuperAdminPrescriptions((list) =>
        (list as { id: string }[]).map((x) => (x.id === prescriptionId ? { ...x, ...updated } : x)),
      );
      showToast('Prescription updated successfully');
    },
    [setSuperAdminPrescriptions, showToast],
  );

  const handleCreateStaffUser = useCallback(async () => {
    if (!newStaffForm.email.trim() || !newStaffForm.password || !newStaffForm.name.trim()) {
      showToast('Name, email, and password are required');
      return;
    }
    if (userRole === 'SUPER_ADMIN' && !newStaffForm.clinicId) {
      showToast('Select a clinic');
      return;
    }
    try {
      await api.admin.createUser({
        email: newStaffForm.email.trim(),
        password: newStaffForm.password,
        name: newStaffForm.name.trim(),
        phone: newStaffForm.phone.trim() || undefined,
        role: newStaffForm.role,
        clinicId: userRole === 'SUPER_ADMIN' ? newStaffForm.clinicId : undefined,
      });
      showToast('Team member created — they can sign in with this email and password');
      setNewStaffForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'DOCTOR',
        clinicId: userRole === 'SUPER_ADMIN' && adminClinicOptions[0] ? adminClinicOptions[0].id : '',
      });
      const res = await api.admin.users({
        search: clinicAdminSearch.trim() || undefined,
        page: clinicAdminPage,
        limit: 25,
        clinicId: userRole === 'SUPER_ADMIN' && adminFilterClinicId ? adminFilterClinicId : undefined,
      });
      setClinicAdminUsers((res.users ?? []) as ClinicAdminUserRow[]);
      setClinicAdminTotal(res.total ?? 0);
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message ?? 'Failed to create user');
    }
  }, [
    adminClinicOptions,
    adminFilterClinicId,
    clinicAdminPage,
    clinicAdminSearch,
    newStaffForm,
    showToast,
    userRole,
  ]);

  const handleToggleStaffActive = useCallback(
    async (u: { id: string; role?: string; isActive?: boolean }) => {
      if (u.id === currentUserId) {
        showToast('You cannot change your own access here');
        return;
      }
      if (u.role === 'SUPER_ADMIN') {
        showToast('Platform admins are managed separately');
        return;
      }
      try {
        await api.admin.updateUser(u.id, { isActive: !u.isActive });
        showToast(!u.isActive ? 'Access enabled' : 'Access disabled');
        setClinicAdminUsers((list) =>
          list.map((row) => (row.id === u.id ? { ...row, isActive: !u.isActive } : row)),
        );
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Update failed');
      }
    },
    [currentUserId, showToast],
  );

  const handleStaffRoleChange = useCallback(
    async (u: { id: string; role?: string }, role: string) => {
      if (u.id === currentUserId) {
        showToast('You cannot change your own role here');
        return;
      }
      if (u.role === 'SUPER_ADMIN') {
        showToast('Cannot change platform admin role here');
        return;
      }
      try {
        await api.admin.updateUser(u.id, { role });
        showToast('Role updated');
        setClinicAdminUsers((list) => list.map((row) => (row.id === u.id ? { ...row, role } : row)));
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Update failed');
      }
    },
    [currentUserId, showToast],
  );

  return {
    superAdminTab,
    setSuperAdminTab,
    superAdminDoctorSearch,
    setSuperAdminDoctorSearch,
    superAdminPatientSearch,
    setSuperAdminPatientSearch,
    superAdminStats,
    superAdminClinics,
    superAdminRevenue,
    superAdminUtilization,
    superAdminLogs,
    superAdminDoctors,
    superAdminPatients,
    superAdminPrescriptions,
    superAdminLoading,
    superAdminPending,
    clinicAdminUsers,
    clinicAdminTotal,
    clinicAdminLoading,
    clinicAdminSearchInput,
    setClinicAdminSearchInput,
    clinicAdminSearch,
    clinicAdminPage,
    setClinicAdminPage,
    adminFilterClinicId,
    setAdminFilterClinicId,
    adminClinicOptions,
    newStaffForm,
    setNewStaffForm,
    approvePendingSignup,
    rejectPendingSignup,
    updateDoctorRow,
    updatePatientRow,
    updatePrescriptionRow,
    handleCreateStaffUser,
    handleToggleStaffActive,
    handleStaffRoleChange,
    demoResetLoading,
    resetDemoData,
  };
}
