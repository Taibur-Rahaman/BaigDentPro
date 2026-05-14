import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { STARTER_PRACTICE_HOME } from '@/config/workspaceResolver';
import { isStarterStaffRole } from '@/lib/starterStaffRoles';
import { isClinicalWorkspacePathname } from '@/pages/practice/practiceNav';

/**
 * DPMS / growth segments starter staff must never land on (silent redirect — no Unauthorized page).
 * Practice shell URLs (`/dashboard/overview`, …) are allowlisted separately in workspaceResolver.
 */
const STARTER_FORBIDDEN_DASHBOARD_SEGMENTS = new Set([
  'branches',
  'subscription',
  'plans',
  'billing-console',
  'clinic-profile',
  'activity',
  'invites',
  'products',
  'orders',
  'settings',
  'users',
  'insurance',
  'communication',
  'inventory',
  'staff-schedule',
  'clinic-control',
  'patient-portal',
]);

/**
 * When true, child dashboard routes should not render — caller shows loading until session is ready.
 */
export function useStarterDashboardGuards(): {
  loading: boolean;
  redirectElement: React.ReactElement | null;
} {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return { loading: true, redirectElement: null };
  }

  const role = (user?.role ?? '').trim();
  if (!isStarterStaffRole(role)) {
    return { loading: false, redirectElement: null };
  }

  const pathname = location.pathname;

  if (pathname.startsWith('/dashboard/admin')) {
    return { loading: false, redirectElement: <Navigate to={STARTER_PRACTICE_HOME} replace /> };
  }

  const segMatch = pathname.match(/^\/dashboard\/([^/?]+)/);
  const seg = segMatch?.[1];

  if (seg === 'calendar') {
    return { loading: false, redirectElement: <Navigate to="/dashboard/workspace-calendar" replace /> };
  }

  if (!seg || pathname === '/dashboard' || pathname === '/dashboard/') {
    return { loading: false, redirectElement: null };
  }

  if (isClinicalWorkspacePathname(pathname)) {
    return { loading: false, redirectElement: null };
  }

  if (STARTER_FORBIDDEN_DASHBOARD_SEGMENTS.has(seg)) {
    return { loading: false, redirectElement: <Navigate to={STARTER_PRACTICE_HOME} replace /> };
  }

  return { loading: false, redirectElement: null };
}
