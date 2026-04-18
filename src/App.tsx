import React, { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { ApiHealthBanner } from '@/components/ApiHealthBanner';
import { HomePage } from './HomePage';
import { ApiTestPage } from './pages/ApiTestPage';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { UsersPage } from './pages/dashboard/UsersPage';
import { BranchesPage } from './pages/dashboard/BranchesPage';
import { ClinicSubscriptionPage } from './pages/dashboard/ClinicSubscriptionPage';
import { ClinicActivityLogsPage } from './pages/dashboard/ClinicActivityLogsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminClinicsPage } from './pages/admin/AdminClinicsPage';
import { AdminDashboardLayout } from './pages/admin/AdminDashboardLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { LoginPage } from './pages/LoginPage';
import { PortalAuthPage } from './pages/PortalAuthPage';
import { PracticeWorkspacePage } from './pages/PracticeWorkspacePage';
import { SignupPage } from './pages/SignupPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGate } from '@/routes/RoleGate';
import { RequireRole } from '@/components/RequireRole';
import { useAuth } from './hooks/useAuth';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { InvitesPage } from './pages/dashboard/InvitesPage';
import { ClinicReportsPage } from './pages/dashboard/ClinicReportsPage';

const showApiTest =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_API_TEST || '').toLowerCase() === 'true';

function HomeRoute() {
  const navigate = useNavigate();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return (
    <HomePage
      onLoginClick={() => navigate('/login')}
      onPortalClick={() => navigate('/portal')}
      {...(showApiTest ? { onApiTestClick: () => navigate('/api-test') } : {})}
    />
  );
}

function DashboardSection() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

export const App: React.FC = () => (
  <>
    <ApiHealthBanner />
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/portal" element={<PortalAuthPage />} />
      <Route
        path="/api-test"
        element={
          <ProtectedRoute>
            {showApiTest ? (
              <ApiTestPage onBack={() => window.history.back()} />
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<DashboardSection />}>
        <Route
          path="admin"
          element={
            <RoleGate allow={['ADMIN']}>
              <AdminDashboardLayout />
            </RoleGate>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="clinics" element={<AdminClinicsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="logs" element={<AdminAuditLogsPage />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHomePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route
            path="reports"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'SUPER_ADMIN']}>
                <ClinicReportsPage />
              </RequireRole>
            }
          />
          <Route path="subscription" element={<ClinicSubscriptionPage />} />
          <Route path="activity" element={<ClinicActivityLogsPage />} />
          <Route
            path="invites"
            element={
              <RequireRole roles={['CLINIC_ADMIN', 'SUPER_ADMIN']}>
                <InvitesPage />
              </RequireRole>
            }
          />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="users"
            element={
              <RoleGate allow={['ADMIN']}>
                <UsersPage />
              </RoleGate>
            }
          />
          <Route path="practice" element={<PracticeWorkspacePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);
