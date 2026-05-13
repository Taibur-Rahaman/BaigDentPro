import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { PatientPortalAppointmentRow } from '@/types/patientPortal';

export function usePatientPortalAppointmentsView(enabled: boolean) {
  const [appointments, setAppointments] = useState<PatientPortalAppointmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setLoading(true);
    try {
      const { appointments: rows } = await api.patientPortal.listAppointments();
      setAppointments(rows);
    } catch (e) {
      setAppointments([]);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const book = async (input: { date: string; time: string; notes?: string | null }) => {
    setError(null);
    setBusyId('new');
    try {
      await api.patientPortal.bookAppointment({
        date: input.date,
        time: input.time,
        duration: 30,
        notes: input.notes ?? null,
      });
      await load();
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      await api.patientPortal.cancelAppointment(id);
      await load();
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusyId(null);
    }
  };

  return { appointments, loading, error, busyId, reload: load, book, cancel };
}
