import React from 'react';
import { Outlet } from 'react-router-dom';
import { ApiHealthBanner } from '@/components/ApiHealthBanner';

/**
 * Shell for routes already wrapped by `ProtectedRoute` in `App.tsx`.
 * Renders `ApiHealthBanner` above nested routes so health UI never mounts on login/auth branches.
 */
export const AuthenticatedLayout: React.FC = () => (
  <>
    <ApiHealthBanner />
    <Outlet />
  </>
);
