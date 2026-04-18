import React from 'react';
import { Outlet } from 'react-router-dom';
import { TenantShellNav } from '@/components/TenantShellNav';
import { useAuth } from '@/hooks/useAuth';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="tenant-app-shell">
      <TenantShellNav userName={user?.name} planLabel={user?.tenant?.plan} />
      <main className="tenant-app-main">
        <Outlet />
      </main>
    </div>
  );
};
