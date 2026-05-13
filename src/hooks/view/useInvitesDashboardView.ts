import { useState } from 'react';
import api from '@/api';

export type InviteStaffRole = 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN' | 'STORE_MANAGER';

export function parseInviteStaffRole(raw: string): InviteStaffRole | undefined {
  if (raw === 'DOCTOR' || raw === 'RECEPTIONIST' || raw === 'ADMIN' || raw === 'STORE_MANAGER') return raw;
  return undefined;
}

export function useInvitesDashboardView() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendInvite = async (params: {
    email: string;
    role: InviteStaffRole;
    clinicId?: string;
  }) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body: { email: string; role: InviteStaffRole; clinicId?: string } = {
        email: params.email.trim(),
        role: params.role,
      };
      if (params.clinicId?.trim()) body.clinicId = params.clinicId.trim();
      const res = await api.invite.create(body);
      setMessage(`Invite sent. Link: ${res.acceptUrl}`);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invite failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, message, error, sendInvite, clearFeedback: () => { setMessage(null); setError(null); } };
}
