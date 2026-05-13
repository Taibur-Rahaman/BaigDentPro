import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Old `/dashboard/practice/<segment>` → flat `/dashboard/...` */
const LEGACY_SEGMENT_TO_PATH: Record<string, string> = {
  overview: '/dashboard/overview',
  patients: '/dashboard/patients',
  prescription: '/dashboard/prescription',
  prescriptions: '/dashboard/prescriptions',
  appointments: '/dashboard/appointments',
  billing: '/dashboard/billing',
  reports: '/dashboard/reports',
  lab: '/dashboard/lab',
  drugs: '/dashboard/drugs',
  sms: '/dashboard/sms',
  settings: '/dashboard/workspace-settings',
};

export const PracticeLegacyRedirect: React.FC = () => {
  const { segment } = useParams();
  const key = (segment ?? '').trim();
  const to = LEGACY_SEGMENT_TO_PATH[key] ?? '/dashboard/overview';
  return <Navigate to={to} replace />;
};
