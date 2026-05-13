import React from 'react';
import { Outlet } from 'react-router-dom';
import { TenantShellNav } from '@/components/TenantShellNav';
import { useAuth } from '@/hooks/useAuth';
import { formatShellUserLabel } from '@/lib/professionalDisplay';

export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="tenant-app-shell">
      <TenantShellNav
        userName={user ? formatShellUserLabel(user) : undefined}
        planLabel={user?.tenant?.plan}
        productFeatures={user?.tenant?.productFeatures}
      />
      <main className="tenant-app-main">
        <Outlet />
      </main>
    </div>
  );
};
