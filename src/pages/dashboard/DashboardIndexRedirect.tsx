import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { postAuthDashboardPath } from '@/lib/postAuthDashboardPath';
import { TenantDashboardHomePage } from '@/pages/TenantDashboardHomePage';

/**
 * Shop landing at `/dashboard`; clinical staff sync to practice URLs; platform admin → admin.
 * Uses the same role → path rules as post-login redirect to avoid drift.
 */
export const DashboardIndexRedirect: React.FC = () => {
  const { user } = useAuth();
  const dest = postAuthDashboardPath(user);
  if (dest !== '/dashboard') {
    return <Navigate to={dest} replace />;
  }
  return <TenantDashboardHomePage />;
};
