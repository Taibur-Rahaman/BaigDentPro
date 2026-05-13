import React from 'react';
import { Navigate } from 'react-router-dom';
import { RoleGate } from '@/routes/RoleGate';
import { useAuth } from '@/hooks/useAuth';
import { UsersPage } from '@/pages/dashboard/UsersPage';

/**
 * Clinic admins use the tenant dashboard user directory at `/dashboard/users`.
 * SUPER_ADMIN must use the enterprise admin grid at `/dashboard/admin/users` (virtualized, URL state, platform APIs).
 */
export const DashboardUsersRoute: React.FC = () => {
  const { user } = useAuth();
  if ((user?.role ?? '').trim() === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard/admin/users" replace />;
  }
  return (
    <RoleGate allow={['CLINIC_ADMIN', 'CLINIC_OWNER']}>
      <UsersPage />
    </RoleGate>
  );
};
