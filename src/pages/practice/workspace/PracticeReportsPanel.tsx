import React from 'react';
import { ClinicReportsPage } from '@/pages/dashboard/ClinicReportsPage';

/** In-workspace reports (CSV export, ranges) — same module as shell `/dashboard/reports` redirect target. */
export const PracticeReportsPanel: React.FC = () => (
  <div className="dashboard-content">
    <ClinicReportsPage />
  </div>
);
