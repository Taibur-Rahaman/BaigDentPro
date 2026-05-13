import React, { Suspense, lazy, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { OverviewPage } from '@/pages/dashboard/practice/OverviewPage';
import { PatientsPage } from '@/pages/dashboard/practice/PatientsPage';
import { AppointmentsPage } from '@/pages/dashboard/practice/AppointmentsPage';
import { PrescriptionsPage } from '@/pages/dashboard/practice/PrescriptionsPage';
import { BillingPage } from '@/pages/dashboard/practice/BillingPage';
import { PracticeLegacyRedirect } from '@/pages/practice/PracticeLegacyRedirect';
import { HomePage } from './HomePage';
import { ApiTestPage } from './pages/ApiTestPage';
import { DashboardIndexRedirect } from './pages/dashboard/DashboardIndexRedirect';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { DashboardUsersRoute } from './pages/dashboard/DashboardUsersRoute';
import { BranchesPage } from './pages/dashboard/BranchesPage';
import { ClinicSubscriptionPage } from './pages/dashboard/ClinicSubscriptionPage';
import { ClinicProfilePage } from './pages/dashboard/ClinicProfilePage';
import { ClinicActivityLogsPage } from './pages/dashboard/ClinicActivityLogsPage';
import { AdminClinicsPage } from './pages/admin/AdminClinicsPage';
import { AdminDashboardLayout } from './pages/admin/AdminDashboardLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminBrandingPage } from './pages/admin/AdminBrandingPage';
import { AdminSubscriptionPaymentsPage } from './pages/admin/AdminSubscriptionPaymentsPage';
import { AdminRolesCapabilitiesPage } from './pages/admin/AdminRolesCapabilitiesPage';
import { AdminSecurityCenterPage } from './pages/admin/AdminSecurityCenterPage';
import { AdminSupportOpsPage } from './pages/admin/AdminSupportOpsPage';
import { AdminSettingsCenterPage } from './pages/admin/AdminSettingsCenterPage';
import { LoginPage } from './pages/LoginPage';
import { PortalAuthPage } from './pages/PortalAuthPage';
import { PracticeWorkspacePage } from './pages/PracticeWorkspacePage';
import { SignupPage } from './pages/SignupPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGate } from '@/routes/RoleGate';
import { RequireRole } from '@/components/RequireRole';
import { useAuth } from './hooks/useAuth';
import { postAuthDashboardPath } from '@/lib/postAuthDashboardPath';
import { canAccessCommerceOnlyAccount, canAccessEnterpriseAdminRoute } from '@/lib/routeAccess';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { InvitesPage } from './pages/dashboard/InvitesPage';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { PracticeChildRoute } from '@/pages/practice/PracticeChildRoute';
import { InsuranceClaimsPage } from '@/pages/dashboard/InsuranceClaimsPage';
import { OperationsCalendarPage } from '@/pages/dashboard/OperationsCalendarPage';
import { CommunicationHubPage } from '@/pages/dashboard/CommunicationHubPage';
import { ClinicInventoryPage } from '@/pages/dashboard/ClinicInventoryPage';
import { StaffSchedulePage } from '@/pages/dashboard/StaffSchedulePage';
import { ClinicControlPanelPage } from '@/pages/dashboard/ClinicControlPanelPage';
import { PatientPortalSettingsPage } from '@/pages/dashboard/PatientPortalSettingsPage';
import { PatientPortalLayout } from '@/pages/portal/PatientPortalLayout';
import { PatientPortalLoginPage } from '@/pages/portal/PatientPortalLoginPage';
import { PatientPortalDashboardPage } from '@/pages/portal/PatientPortalDashboardPage';
import { PatientPortalBookAppointmentPage } from '@/pages/portal/PatientPortalBookAppointmentPage';
import { PatientPortalMedicalRecordsPage } from '@/pages/portal/PatientPortalMedicalRecordsPage';
import { PatientPortalBillingPage } from '@/pages/portal/PatientPortalBillingPage';
import { NetworkLayout } from '@/pages/network/NetworkLayout';
import { NetworkDashboardPage } from '@/pages/network/NetworkDashboardPage';
import { NetworkBranchesPage } from '@/pages/network/NetworkBranchesPage';
import { NetworkStaffPage } from '@/pages/network/NetworkStaffPage';
import { NetworkPatientsGlobalPage } from '@/pages/network/NetworkPatientsGlobalPage';
import { NetworkAnalyticsPage } from '@/pages/network/NetworkAnalyticsPage';
import { PlanComparisonPage } from '@/pages/dashboard/PlanComparisonPage';
import { BillingDashboardPage } from '@/pages/dashboard/BillingDashboardPage';

const CLINICAL_PRACTICE_ROLE_ALLOW = [
  'CLINIC_ADMIN',
  'CLINIC_OWNER',
  'DOCTOR',
  'RECEPTIONIST',
  'SUPER_ADMIN',
] as const satisfies readonly string[];

/** Routes that touch clinic operations / subscription (not shop-only staff). */
const DPMS_DASHBOARD_ROUTE_ROLES = [
  'CLINIC_ADMIN',
  'CLINIC_OWNER',
  'DOCTOR',
  'RECEPTIONIST',
  'LAB_TECH',
  'DENTAL_ASSISTANT',
  'SUPER_ADMIN',
] as const satisfies readonly string[];

/** Clinic-operator pages where doctors should not land (billing/subscription UI, audit trails). */
const DPMS_ROUTE_ROLES_WITHOUT_DOCTOR = DPMS_DASHBOARD_ROUTE_ROLES.filter((r) => r !== 'DOCTOR');

const showApiTest =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_API_TEST || '').toLowerCase() === 'true';

const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);

const AdminUsersGridStressPage = lazy(() =>
  import('@/pages/admin/AdminUsersGridStressPage').then((m) => ({ default: m.AdminUsersGridStressPage })),
);

const AdminSystemMonitoringPage = lazy(() =>
  import('@/pages/admin/AdminSystemMonitoringPage').then((m) => ({ default: m.AdminSystemMonitoringPage })),
);

const adminRouteSuspenseFallback = (
  <div className="tenant-loading" role="status" style={{ padding: '2rem' }}>
    <div className="neo-loading-spinner tenant-spinner" />
    <span>Loading…</span>
  </div>
);

function HomeRoute() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(postAuthDashboardPath(user), { replace: true });
    }
  }, [loading, isAuthenticated, navigate, user]);

  return (
    <HomePage
      onLoginClick={() => navigate('/login')}
      onPortalClick={() => navigate('/staff-portal')}
      {...(showApiTest ? { onApiTestClick: () => navigate('/api-test') } : {})}
    />
  );
}

function DashboardSection() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout />
    </ProtectedRoute>
  );
}

/**
 * Enterprise chrome at `/dashboard/admin/*`.
 * Clinical desk roles use practice workspace; commerce accounts stay on the shop dashboard.
 * `ENTERPRISE_ADMIN` keyword (see `src/lib/roles.ts`) — not `CLINIC_ADMIN`, who remains on clinic routes only.
 */
function EnterpriseAdminShell() {
  const { user, loading } = useAuth();
  if (loading) {
    return adminRouteSuspenseFallback;
  }
  const r = (user?.role ?? '').trim();
  if (canAccessCommerceOnlyAccount(r)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (
    r === 'DOCTOR' ||
    r === 'RECEPTIONIST' ||
    r === 'CLINIC_ADMIN' ||
    r === 'LAB_TECH' ||
    r === 'DENTAL_ASSISTANT'
  ) {
    return <Navigate to="/dashboard/overview" replace />;
  }
  if (!canAccessEnterpriseAdminRoute(r)) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <RoleGate allow={['ENTERPRISE_ADMIN']}>
      <AdminDashboardLayout />
    </RoleGate>
  );
}

export const App: React.FC = () => (
  <>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/staff-portal" element={<PortalAuthPage />} />
      <Route path="/portal" element={<PatientPortalLayout />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<PatientPortalLoginPage />} />
        <Route path="dashboard" element={<PatientPortalDashboardPage />} />
        <Route path="book-appointment" element={<PatientPortalBookAppointmentPage />} />
        <Route path="medical-records" element={<PatientPortalMedicalRecordsPage />} />
        <Route path="billing" element={<PatientPortalBillingPage />} />
      </Route>
      <Route
        path="/network"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route
          element={
            <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN']}>
              <NetworkLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<NetworkDashboardPage />} />
          <Route path="branches" element={<NetworkBranchesPage />} />
          <Route path="staff" element={<NetworkStaffPage />} />
          <Route path="patients-global" element={<NetworkPatientsGlobalPage />} />
          <Route path="analytics" element={<NetworkAnalyticsPage />} />
        </Route>
      </Route>
      <Route
        path="/api-test"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            showApiTest ? <ApiTestPage onBack={() => window.history.back()} /> : <Navigate to="/" replace />
          }
        />
      </Route>
      <Route path="/dashboard" element={<DashboardSection />}>
        <Route path="admin" element={<EnterpriseAdminShell />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="tenants" element={<AdminClinicsPage />} />
          <Route path="clinics" element={<Navigate to="/dashboard/admin/tenants" replace />} />
          {import.meta.env.DEV ? (
            <Route
              path="users/stress"
              element={
                <RequireRole roles={['SUPER_ADMIN']}>
                  <Suspense fallback={adminRouteSuspenseFallback}>
                    <AdminUsersGridStressPage />
                  </Suspense>
                </RequireRole>
              }
            />
          ) : null}
          <Route
            path="users"
            element={
              <Suspense fallback={adminRouteSuspenseFallback}>
                <AdminUsersPage />
              </Suspense>
            }
          />
          <Route
            path="roles-capabilities"
            element={
              <RequireRole roles={['SUPER_ADMIN']}>
                <AdminRolesCapabilitiesPage />
              </RequireRole>
            }
          />
          <Route path="billing" element={<Outlet />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route
              path="plan-payments"
              element={
                <RequireRole roles={['SUPER_ADMIN']}>
                  <AdminSubscriptionPaymentsPage />
                </RequireRole>
              }
            />
          </Route>
          <Route path="orders" element={<Navigate to="/dashboard/admin/billing/orders" replace />} />
          <Route path="subscription-payments" element={<Navigate to="/dashboard/admin/billing/plan-payments" replace />} />
          <Route
            path="monitoring"
            element={
              <Suspense fallback={adminRouteSuspenseFallback}>
                <AdminSystemMonitoringPage />
              </Suspense>
            }
          />
          <Route path="security" element={<Outlet />}>
            <Route index element={<Navigate to="audit" replace />} />
            <Route path="audit" element={<AdminSecurityCenterPage />} />
          </Route>
          <Route path="logs" element={<Navigate to="/dashboard/admin/security/audit" replace />} />
          <Route
            path="support"
            element={
              <RequireRole roles={['SUPER_ADMIN']}>
                <AdminSupportOpsPage />
              </RequireRole>
            }
          />
          <Route path="branding" element={<AdminBrandingPage />} />
          <Route path="settings" element={<AdminSettingsCenterPage />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardIndexRedirect />} />
          <Route
            path="branches"
            element={
              <RequireRole roles={[...DPMS_DASHBOARD_ROUTE_ROLES]}>
                <BranchesPage />
              </RequireRole>
            }
          />
          <Route
            path="subscription"
            element={
              <RequireRole roles={[...DPMS_ROUTE_ROLES_WITHOUT_DOCTOR]}>
                <ClinicSubscriptionPage />
              </RequireRole>
            }
          />
          <Route
            path="plans"
            element={
              <RequireRole
                roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN', 'TENANT', 'STORE_MANAGER']}
              >
                <PlanComparisonPage />
              </RequireRole>
            }
          />
          <Route
            path="billing-console"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'SUPER_ADMIN']}>
                <BillingDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="clinic-profile"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN']}>
                <ClinicProfilePage />
              </RequireRole>
            }
          />
          <Route
            path="activity"
            element={
              <RequireRole roles={[...DPMS_ROUTE_ROLES_WITHOUT_DOCTOR]}>
                <ClinicActivityLogsPage />
              </RequireRole>
            }
          />
          <Route
            path="invites"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'SUPER_ADMIN']}>
                <InvitesPage />
              </RequireRole>
            }
          />
          <Route
            path="products"
            element={
              <RequireRole roles={['SAAS_TENANT']}>
                <ProductsPage />
              </RequireRole>
            }
          />
          <Route
            path="orders"
            element={
              <RequireRole roles={['SAAS_TENANT']}>
                <OrdersPage />
              </RequireRole>
            }
          />
          <Route
            path="settings"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN']}>
                <SettingsPage />
              </RequireRole>
            }
          />
          <Route path="users" element={<DashboardUsersRoute />} />
          <Route
            path="insurance"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']}>
                <InsuranceClaimsPage />
              </RequireRole>
            }
          />
          <Route
            path="calendar"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']}>
                <OperationsCalendarPage />
              </RequireRole>
            }
          />
          <Route
            path="communication"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']}>
                <CommunicationHubPage />
              </RequireRole>
            }
          />
          <Route
            path="inventory"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']}>
                <ClinicInventoryPage />
              </RequireRole>
            }
          />
          <Route
            path="staff-schedule"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']}>
                <StaffSchedulePage />
              </RequireRole>
            }
          />
          <Route
            path="clinic-control"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'SUPER_ADMIN']}>
                <ClinicControlPanelPage />
              </RequireRole>
            }
          />
          <Route
            path="patient-portal"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN']}>
                <PatientPortalSettingsPage />
              </RequireRole>
            }
          />
          <Route path="practice" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="practice/:segment" element={<PracticeLegacyRedirect />} />
          <Route
            element={
              <RequireRole roles={[...CLINICAL_PRACTICE_ROLE_ALLOW]}>
                <PracticeWorkspacePage />
              </RequireRole>
            }
          >
            <Route path="overview" element={<OverviewPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="prescription" element={<PracticeChildRoute />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="reports" element={<PracticeChildRoute />} />
            <Route path="lab" element={<PracticeChildRoute />} />
            <Route path="drugs" element={<PracticeChildRoute />} />
            <Route path="sms" element={<PracticeChildRoute />} />
            <Route path="workspace-settings" element={<PracticeChildRoute />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);
