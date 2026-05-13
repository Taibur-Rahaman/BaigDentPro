import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import api from '@/api';
import { isApiHttpError } from '@/lib/apiErrors';
import { formatLocalYMD, downloadAppointmentIcs, getGoogleCalendarUrl } from '@/hooks/view/practiceWorkspaceShared';
import { loadClinicUiPrefs } from '@/lib/clinicUiPrefs';
import {
  mapAppointmentToViewModel,
  type AppointmentViewModel,
  type PatientViewModel,
} from '@/viewModels';

export function usePracticeAppointmentsDomain(opts: {
  token: string | null | undefined;
  userClinicId?: string;
  appointments: AppointmentViewModel[];
  setAppointments: Dispatch<SetStateAction<AppointmentViewModel[]>>;
  patients: PatientViewModel[];
  filteredAppointments: AppointmentViewModel[];
  loadData: () => void | Promise<void>;
  showToast: (msg: string) => void;
}) {
  const { token, userClinicId, setAppointments, patients, filteredAppointments, loadData, showToast } = opts;

  const [appointmentForm, setAppointmentForm] = useState({ patientId: '', date: '', time: '', type: 'Checkup' });
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  const handleSendAppointmentReminder = useCallback(
    async (appointmentId: string) => {
      if (token) {
        try {
          await api.communication.sendAppointmentReminder(appointmentId);
          showToast('Appointment reminder sent');
        } catch (e: unknown) {
          showToast((e as { message?: string })?.message ?? 'Failed to send reminder');
        }
        return;
      }
      showToast('Login to send appointment reminders');
    },
    [showToast, token],
  );

  const setLocalAppointmentStatus = useCallback(
    (appointmentId: string, status: string) => {
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status } : a)));
    },
    [setAppointments],
  );

  const handleConfirmAppointment = useCallback(
    async (appointmentId: string) => {
      if (!token) {
        setLocalAppointmentStatus(appointmentId, 'CONFIRMED');
        showToast('Appointment confirmed');
        return;
      }
      try {
        await api.appointments.confirm(appointmentId);
        showToast('Appointment confirmed');
        await loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to confirm appointment');
      }
    },
    [loadData, setLocalAppointmentStatus, showToast, token],
  );

  const handleCancelAppointment = useCallback(
    async (appointmentId: string) => {
      if (!token) {
        setLocalAppointmentStatus(appointmentId, 'CANCELLED');
        showToast('Appointment cancelled');
        return;
      }
      try {
        await api.appointments.cancel(appointmentId);
        showToast('Appointment cancelled');
        await loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to cancel appointment');
      }
    },
    [loadData, setLocalAppointmentStatus, showToast, token],
  );

  const handleCompleteAppointment = useCallback(
    async (appointmentId: string) => {
      if (!token) {
        setLocalAppointmentStatus(appointmentId, 'COMPLETED');
        showToast('Appointment completed');
        return;
      }
      try {
        await api.appointments.complete(appointmentId);
        showToast('Appointment completed');
        await loadData();
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message ?? 'Failed to complete appointment');
      }
    },
    [loadData, setLocalAppointmentStatus, showToast, token],
  );

  const handleAddAppointment = useCallback(async () => {
    if (!appointmentForm.patientId || !appointmentForm.date || !appointmentForm.time) {
      showToast('Please fill all appointment details');
      return;
    }
    const durationMins = loadClinicUiPrefs(userClinicId).defaultAppointmentMinutes;
    if (token) {
      try {
        const payload = {
          patientId: appointmentForm.patientId,
          date: new Date(`${appointmentForm.date}T${appointmentForm.time}`).toISOString(),
          time: appointmentForm.time,
          duration: durationMins,
          type: appointmentForm.type,
        };
        if (editingAppointmentId) {
          await api.appointments.update(editingAppointmentId, payload);
          setEditingAppointmentId(null);
          showToast('Appointment rescheduled');
        } else {
          await api.appointments.create(payload);
          showToast('Appointment scheduled');
        }
        setAppointmentForm({ patientId: '', date: '', time: '', type: 'Checkup' });
        void loadData();
      } catch (e: unknown) {
        if (isApiHttpError(e) && e.status === 409) {
          try {
            const j = JSON.parse(e.rawBody) as {
              suggestedSlot?: { date: string; time: string };
              error?: string;
            };
            if (j.suggestedSlot?.date && j.suggestedSlot?.time) {
              showToast(
                `${j.error ?? 'That slot conflicts with another booking'}. Next available: ${j.suggestedSlot.date} ${j.suggestedSlot.time}.`,
              );
              return;
            }
          } catch {
            /* fall through */
          }
        }
        showToast((e as { message?: string })?.message ?? 'Failed to save appointment');
      }
      return;
    }
    if (editingAppointmentId) {
      showToast('Sign in to reschedule appointments');
      return;
    }
    const patient = patients.find((p) => p.id === appointmentForm.patientId);
    setAppointments((prev) => {
      const newAppointment = mapAppointmentToViewModel(
        api.optimistic.appointmentFromForm({
          patientId: appointmentForm.patientId,
          patientName: patient?.name || 'Unknown',
          patientPhone: patient?.phone,
          date: appointmentForm.date,
          time: appointmentForm.time,
          type: appointmentForm.type,
        }),
      );
      return [newAppointment, ...prev];
    });
    setAppointmentForm({ patientId: '', date: '', time: '', type: 'Checkup' });
    showToast('Appointment scheduled');
  }, [
    appointmentForm.date,
    appointmentForm.patientId,
    appointmentForm.time,
    appointmentForm.type,
    editingAppointmentId,
    loadData,
    patients,
    showToast,
    token,
    userClinicId,
    setAppointments,
  ]);

  const beginRescheduleAppointment = useCallback((apt: AppointmentViewModel) => {
    setEditingAppointmentId(apt.id);
    setAppointmentForm({
      patientId: apt.patientId,
      date: apt.date,
      time: apt.time,
      type: apt.type || 'Checkup',
    });
    showToast('Adjust date/time/type, then save to reschedule.');
  }, [showToast]);

  const cancelAppointmentEditMode = useCallback(() => {
    setEditingAppointmentId(null);
    setAppointmentForm({ patientId: '', date: '', time: '', type: 'Checkup' });
  }, []);

  const exportAppointmentsCsv = useCallback(() => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      ['Date', 'Time', 'Patient', 'Phone', 'Type', 'Status', 'Duration (min)'].join(','),
      ...filteredAppointments.map((a) =>
        [
          esc(a.date),
          esc(a.time),
          esc(a.patientName),
          esc(a.patientPhone || ''),
          esc(a.type),
          esc(a.status),
          String(a.duration ?? 30),
        ].join(','),
      ),
    ];
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${formatLocalYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Appointments exported');
  }, [filteredAppointments, showToast]);

  return {
    appointmentForm,
    setAppointmentForm,
    editingAppointmentId,
    setEditingAppointmentId,
    handleSendAppointmentReminder,
    handleConfirmAppointment,
    handleCancelAppointment,
    handleCompleteAppointment,
    handleAddAppointment,
    beginRescheduleAppointment,
    cancelAppointmentEditMode,
    exportAppointmentsCsv,
    downloadAppointmentIcs,
    getGoogleCalendarUrl,
  };
}
