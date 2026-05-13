/**
 * Workflow domain — appointment scheduling rules + mounts (HTTP paths unchanged).
 */
export { default as appointmentRoutes } from '../../routes/appointments.js';
export {
  workflowCreateAppointment,
  workflowUpdateAppointment,
  workflowSetAppointmentStatus,
  workflowCompleteAppointment,
  workflowDeleteAppointment,
  workflowMarkReminderSent,
  workflowApplyTreatmentPlanPut,
  suggestNextAvailableSlotAfterConflict,
  AppointmentConflictError,
  InvalidStateTransitionError,
} from './appointmentWorkflowService.js';
