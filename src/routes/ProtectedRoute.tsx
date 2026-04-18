import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: '#64748b',
        }}
      >
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28 }} aria-hidden />
        <span>Loading session…</span>
      </div>
    );
  }

  if (!user?.id) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.clinicId) {
    return <Navigate to="/login" replace state={{ from: location.pathname, reason: 'no-clinic' }} />;
  }

  return <>{children}</>;
};
