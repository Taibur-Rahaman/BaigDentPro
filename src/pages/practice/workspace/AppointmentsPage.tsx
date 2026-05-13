import React from 'react';
import { formatLocalYMD, parseAppointmentStartLocal } from '@/hooks/view/practiceWorkspaceShared';
import { prettifyAppointmentStatus } from '@/viewModels/formatters';
import { usePracticeWorkspaceView } from '@/contexts/practiceWorkspace/PracticeWorkspaceViewContext';

export function AppointmentsPage() {
  const {
    appointmentForm,
    appointmentScheduleFilter,
    appointmentViewMode,
    appointments,
    beginRescheduleAppointment,
    cancelAppointmentEditMode,
    downloadAppointmentIcs,
    editingAppointmentId,
    exportAppointmentsCsv,
    filteredAppointments,
    getGoogleCalendarUrl,
    handleAddAppointment,
    handleCancelAppointment,
    handleCompleteAppointment,
    handleConfirmAppointment,
    handleSendAppointmentReminder,
    patients,
    setAppointmentForm,
    setAppointmentScheduleFilter,
    setAppointmentViewMode,
    setCalendarWeekOffset,
    token,
    weekCalendarDays,
  } = usePracticeWorkspaceView();

  return (
<div className="dashboard-content">
<div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
<div>
<h1><i className="fa-solid fa-calendar-check"></i> Appointments</h1>
<p><span className="highlight">Schedule & filter</span> — {filteredAppointments.length} shown</p>
</div>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'upcoming' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentScheduleFilter('upcoming')}
>
Upcoming
</button>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'today' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentScheduleFilter('today')}
>
Today
</button>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'week' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentScheduleFilter('week')}
>
Next 7 days
</button>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentScheduleFilter === 'all' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentScheduleFilter('all')}
>
All
</button>
<button type="button" className="btn-secondary btn-sm" onClick={exportAppointmentsCsv} disabled={filteredAppointments.length === 0}>
<i className="fa-solid fa-file-csv"></i> Export CSV
</button>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentViewMode === 'list' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentViewMode('list')}
>
List
</button>
<button
type="button"
className={`btn-secondary btn-sm ${appointmentViewMode === 'week' ? 'billing-filter-active' : ''}`}
onClick={() => setAppointmentViewMode('week')}
>
Week view
</button>
</div>
</div>

{appointmentViewMode === 'week' ? (
<div className="dashboard-card" style={{ marginBottom: 16 }}>
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: 12 }}>
<h3 style={{ margin: 0 }}>
<i className="fa-solid fa-calendar-week" /> Weekly grid (Mon–Sun)
</h3>
<div style={{ display: 'flex', gap: 8 }}>
<button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset((x) => x - 1)}>
← Prev week
</button>
<button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset(0)}>
This week
</button>
<button type="button" className="btn-secondary btn-sm" onClick={() => setCalendarWeekOffset((x) => x + 1)}>
Next week →
</button>
</div>
</div>
<div
style={{
display: 'grid',
gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
gap: 10,
minHeight: 200,
}}
>
{weekCalendarDays.map((ymd) => {
const dayAppts = filteredAppointments.filter((a) => a.date === ymd);
const [cy, cm, cd] = ymd.split('-').map((x) => parseInt(x, 10));
const d = new Date(cy, (cm || 1) - 1, cd || 1);
const isTodayCell = ymd === formatLocalYMD(new Date());
return (
<div
key={ymd}
style={{
border: `1px solid ${isTodayCell ? 'rgba(59,130,246,0.85)' : 'rgba(148,163,184,0.45)'}`,
borderRadius: 10,
padding: 10,
background: isTodayCell ? 'rgba(59,130,246,0.06)' : 'rgba(248,250,252,0.9)',
}}
>
<div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--neo-text-muted)', marginBottom: 8 }}>
{d.toLocaleDateString(undefined, { weekday: 'short' })}
<br />
<span style={{ fontSize: '1.05rem', color: '#0f172a' }}>{d.getDate()}</span>
</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
{dayAppts.length === 0 ? (
<span style={{ fontSize: 12, opacity: 0.7 }}>—</span>
) : (
dayAppts.map((apt) => {
const st = String(apt.status || '').toUpperCase();
const done = st === 'COMPLETED';
const upcoming = ['SCHEDULED', 'CONFIRMED'].includes(st);
return (
<div key={apt.id} style={{ fontSize: '0.72rem', lineHeight: 1.35, padding: '6px 6px', borderRadius: 8, background: 'white', border: '1px solid rgba(226,232,240,0.9)' }}>
<strong>{apt.time}</strong> {apt.patientName}
<div style={{ marginTop: 4 }}>
<span
style={{
display: 'inline-block',
borderRadius: 999,
padding: '2px 6px',
fontSize: '0.65rem',
fontWeight: 600,
background: done ? 'rgba(16,185,129,0.15)' : upcoming ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.2)',
color: done ? '#065f46' : upcoming ? '#1e40af' : '#334155',
}}
>
{prettifyAppointmentStatus(apt.status)}
</span>
</div>
</div>
);
})
)}
</div>
</div>
);
})}
</div>
</div>
) : null}

<div className="appointments-page-card">
<div className="appointments-inner-grid">
<div className="form-panel appointments-form-panel">
<h3><i className="fa-solid fa-calendar-plus"></i> {editingAppointmentId ? 'Edit / reschedule appointment' : 'Appointment details'}</h3>
{editingAppointmentId ? (
<p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--neo-text-muted)' }}>
Rescheduling an existing visit — update fields and save.
</p>
) : null}
<div className="appointments-form-grid">
<div className="appointments-field appointments-field-full">
<label>Patient <span className="required">*</span></label>
<select
className="appointments-input"
value={appointmentForm.patientId}
onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })}
>
<option value="">-- Select Patient --</option>
{patients.map((p) => (
<option key={p.id} value={p.id}>
{p.name} - {p.phone}
</option>
))}
</select>
</div>

<div className="appointments-field">
<label>Date <span className="required">*</span></label>
<input
className="appointments-input"
type="date"
value={appointmentForm.date}
onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
/>
</div>

<div className="appointments-field">
<label>Time <span className="required">*</span></label>
<input
className="appointments-input"
type="time"
value={appointmentForm.time}
onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
/>
</div>

<div className="appointments-field">
<label>Type</label>
<select
className="appointments-input"
value={appointmentForm.type}
onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
>
<option value="Checkup">Checkup</option>
<option value="Treatment">Treatment</option>
<option value="Follow-up">Follow-up</option>
<option value="Emergency">Emergency</option>
<option value="Consultation">Consultation</option>
</select>
</div>

<div className="appointments-field appointments-field-action" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
<button className="btn-primary appointments-schedule-btn" onClick={handleAddAppointment} type="button">
<i className="fa-solid fa-plus" aria-hidden="true"></i>{' '}
{editingAppointmentId ? 'Save changes' : 'Schedule appointment'}
</button>
{editingAppointmentId ? (
<button type="button" className="btn-secondary appointments-schedule-btn" onClick={cancelAppointmentEditMode}>
Cancel editing
</button>
) : null}
</div>
</div>
</div>

<div className="list-panel">
<h3><i className="fa-solid fa-list"></i> Appointment list</h3>
<div className="appointments-list">
{appointments.length === 0 ? (
<p className="empty-state">No appointments scheduled</p>
) : filteredAppointments.length === 0 ? (
<p className="empty-state">No appointments match this filter</p>
) : (
filteredAppointments.map(apt => (
<div key={apt.id} className="appointment-card">
<div className="apt-date-block">
{(() => {
const d0 = parseAppointmentStartLocal(apt);
return (
<>
<span className="apt-day">{d0.getDate()}</span>
<span className="apt-month">{d0.toLocaleString('default', { month: 'short' })}</span>
</>
);
})()}
</div>
<div className="apt-details">
<strong>{apt.patientName}</strong>
<span><i className="fa-solid fa-clock"></i> {apt.time}</span>
<span><i className="fa-solid fa-tag"></i> {apt.type}</span>
</div>
<div className="apt-actions">
<span className={`apt-status status-${apt.status.toLowerCase()}`}>{prettifyAppointmentStatus(apt.status)}</span>

<a
className="apt-action-btn"
style={{ textDecoration: 'none' }}
title="Add to Google Calendar"
href={getGoogleCalendarUrl(apt)}
target="_blank"
rel="noreferrer"
>
<i className="fa-solid fa-calendar-plus" aria-hidden="true"></i>
Google
</a>

<button
className="apt-action-btn"
title="Download ICS (Apple Calendar / others)"
type="button"
onClick={() => downloadAppointmentIcs(apt)}
>
<i className="fa-solid fa-file-signature" aria-hidden="true"></i>
ICS
</button>

<button
className="apt-action-btn"
title="Send appointment reminder"
type="button"
onClick={() => handleSendAppointmentReminder(apt.id)}
>
<i className="fa-solid fa-bell" aria-hidden="true"></i>
Remind
</button>

{(String(apt.status || '').toUpperCase() === 'SCHEDULED' ||
String(apt.status || '').toUpperCase() === 'CONFIRMED') &&
token ? (
<button
className="apt-action-btn"
title="Load this appointment into the form to reschedule"
type="button"
onClick={() => beginRescheduleAppointment(apt)}
>
<i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
Reschedule
</button>
) : null}

{String(apt.status || '').toUpperCase() === 'SCHEDULED' && (
<button
className="apt-action-btn"
title="Confirm appointment"
type="button"
onClick={() => handleConfirmAppointment(apt.id)}
>
<i className="fa-solid fa-circle-check" aria-hidden="true"></i>
Confirm
</button>
)}

{(String(apt.status || '').toUpperCase() === 'SCHEDULED' ||
String(apt.status || '').toUpperCase() === 'CONFIRMED') && (
<button
className="apt-action-btn apt-action-btn-danger"
title="Cancel appointment"
type="button"
onClick={() => handleCancelAppointment(apt.id)}
>
<i className="fa-solid fa-xmark" aria-hidden="true"></i>
Cancel
</button>
)}

{String(apt.status || '').toUpperCase() === 'CONFIRMED' && (
<button
className="apt-action-btn"
title="Mark appointment completed"
type="button"
onClick={() => handleCompleteAppointment(apt.id)}
>
<i className="fa-solid fa-clipboard-check" aria-hidden="true"></i>
Complete
</button>
)}
</div>
</div>
))
)}
</div>
</div>
</div>
</div>
</div>
  );
}
