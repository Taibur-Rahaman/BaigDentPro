import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardPage } from '@/DashboardPage';
import api from '@/api';
import { useAuth } from '@/hooks/useAuth';

type UserState = { id?: string; name: string; role?: string; clinicId?: string | null } | null;

/**
 * Full legacy clinic dashboard (patients, appointments, etc.) without the new tenant shell nav.
 */
export const PracticeWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refreshSession } = useAuth();
  const [user, setUser] = useState<UserState>(null);

  useEffect(() => {
    const saved = localStorage.getItem('baigdentpro:user');
    if (saved) {
      try {
        const u = JSON.parse(saved) as UserState;
        setUser(u);
        return;
      } catch {
        localStorage.removeItem('baigdentpro:user');
      }
    }
    const token = api.getToken();
    if (!token) return;
    api.auth
      .me()
      .then((u) => {
        localStorage.setItem('baigdentpro:user', JSON.stringify(u));
        setUser({ id: u.id, name: u.name || '', role: u.role, clinicId: u.clinicId });
      })
      .catch(() => {
        api.auth.logout();
        void refreshSession();
        navigate('/login', { replace: true });
      });
  }, [navigate, refreshSession]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return (
    <DashboardPage
      onLogout={handleLogout}
      userName={user?.name}
      userRole={user?.role}
      userClinicId={user?.clinicId ?? undefined}
      currentUserId={user?.id}
    />
  );
};
