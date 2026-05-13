import React from 'react';
import type { PatientViewModel, LabOrderViewModel } from '@/viewModels';
import type {
  DashboardAppointmentChartPointViewModel,
  DashboardRevenueChartPointViewModel,
  DashboardStatsViewModel,
} from '@/viewModels/dashboardCharts.viewModel';
import type { PracticeNavSection } from '@/pages/practice/practiceNav';

export type PracticeOverviewStats = {
  totalPatients: number;
  todayAppointments: number;
  totalPrescriptions: number;
  prescriptionStatLabel: string;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingLab: number;
  monthlyRevenue: number;
  revenueStatLabel: string;
  pendingDue: number;
  upcomingAppointments: number;
  newPatientsThisMonth: number;
};

type TodayAppointmentRow = {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: string;
};

export type PracticeOverviewPageProps = {
  userName: string;
  dashboardApiStats: DashboardStatsViewModel | null;
  stats: PracticeOverviewStats;
  revenueToday: number;
  dashboardRevenueChart: DashboardRevenueChartPointViewModel[];
  dashboardAppointmentChart: DashboardAppointmentChartPointViewModel[];
  todayAppointments: TodayAppointmentRow[];
  patients: PatientViewModel[];
  dashboardRecentPatients: PatientViewModel[] | null;
  labOrders: LabOrderViewModel[];
  selectPatientForView: (patient: PatientViewModel) => void;
  setPracticeNav: (next: PracticeNavSection) => void;
  setBillingInvoiceFilter: (f: 'all' | 'open' | 'overdue' | 'paid') => void;
  startNewPrescriptionForPatient: (patient: PatientViewModel | null) => void;
};

export const PracticeOverviewPage: React.FC<PracticeOverviewPageProps> = ({
  userName,
  dashboardApiStats,
  stats,
  revenueToday,
  dashboardRevenueChart,
  dashboardAppointmentChart,
  todayAppointments,
  patients,
  dashboardRecentPatients,
  labOrders,
  selectPatientForView,
  setPracticeNav,
  setBillingInvoiceFilter,
  startNewPrescriptionForPatient,
}) => (
  <div className="dashboard-content">
    <div className="page-header">
      <div>
        <h1>
          <i className="fa-solid fa-grid-2"></i> Dashboard
        </h1>
        <p>
          Welcome back, <span className="highlight">Dr. {userName}</span> — clinic overview for today
          {dashboardApiStats ? (
            <>
              {' '}
              · <strong>{stats.upcomingAppointments}</strong> upcoming appts ·{' '}
              <strong>{stats.newPatientsThisMonth}</strong> new patients this month
              {stats.overdueInvoices > 0 ? (
                <>
                  {' '}
                  · <strong style={{ color: '#b45309' }}>{stats.overdueInvoices}</strong> overdue invoice
                  {stats.overdueInvoices === 1 ? '' : 's'}
                </>
              ) : null}
            </>
          ) : null}
          .
        </p>
      </div>
      <div className="header-actions">
        <span style={{ color: 'var(--neo-text-muted)', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-clock" style={{ marginRight: 8, color: 'var(--neo-primary)' }}></i>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>

    <div
      role="region"
      aria-label="Today at a glance"
      style={{
        marginBottom: 16,
        padding: '14px 18px',
        borderRadius: 12,
        background: 'linear-gradient(120deg, rgba(59,130,246,0.08), rgba(16,185,129,0.07))',
        border: '1px solid rgba(148,163,184,0.4)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px 28px',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neo-text-muted)', letterSpacing: '0.06em' }}>
          APPOINTMENTS TODAY
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>{stats.todayAppointments}</div>
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neo-text-muted)', letterSpacing: '0.06em' }}>
          REVENUE TODAY
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>৳{Math.round(revenueToday).toLocaleString()}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--neo-text-muted)', marginTop: 2 }}>
          Paid invoices dated today (estimate)
        </div>
      </div>
    </div>

    <div className="stats-grid">
      <div className="stat-card stat-primary">
        <div className="stat-icon">
          <i className="fa-solid fa-user-group"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.totalPatients}</span>
          <span className="stat-label">Total Patients</span>
        </div>
      </div>
      <div className="stat-card stat-success">
        <div className="stat-icon">
          <i className="fa-solid fa-calendar-check"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.todayAppointments}</span>
          <span className="stat-label">{`Today's Appointments`}</span>
        </div>
      </div>
      <div className="stat-card stat-info">
        <div className="stat-icon">
          <i className="fa-solid fa-file-waveform"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.totalPrescriptions}</span>
          <span className="stat-label">{stats.prescriptionStatLabel}</span>
        </div>
      </div>
      <div className="stat-card stat-warning">
        <div className="stat-icon">
          <i className="fa-solid fa-receipt"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.pendingInvoices}</span>
          <span className="stat-label">Open invoices</span>
          {stats.pendingDue > 0 && (
            <span className="stat-sublabel">৳{Math.round(stats.pendingDue).toLocaleString()} outstanding</span>
          )}
        </div>
      </div>
      <div className="stat-card stat-danger">
        <div className="stat-icon">
          <i className="fa-solid fa-flask-vial"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.pendingLab}</span>
          <span className="stat-label">Pending Lab Work</span>
        </div>
      </div>
      <div className="stat-card stat-revenue">
        <div className="stat-icon">
          <i className="fa-solid fa-sack-dollar"></i>
        </div>
        <div className="stat-info">
          <span className="stat-value">৳{Math.round(stats.monthlyRevenue).toLocaleString()}</span>
          <span className="stat-label">{stats.revenueStatLabel}</span>
        </div>
      </div>
    </div>

    {dashboardApiStats && stats.pendingDue > 0 && (
      <div className="dashboard-ar-banner" role="status">
        <i className="fa-solid fa-circle-exclamation" aria-hidden />
        <span>
          Accounts receivable: <strong>৳{Math.round(stats.pendingDue).toLocaleString()}</strong> across open invoices
          {stats.overdueInvoices > 0 ? (
            <>
              {' '}
              (<strong>{stats.overdueInvoices}</strong> past due date)
            </>
          ) : null}
          {' — '}
          <button
            type="button"
            className="link-inline"
            onClick={() => {
              setBillingInvoiceFilter('overdue');
              setPracticeNav('billing');
            }}
          >
            Review overdue
          </button>
          {' · '}
          <button type="button" className="link-inline" onClick={() => setPracticeNav('billing')}>
            Billing
          </button>
          .
        </span>
      </div>
    )}

    {(dashboardRevenueChart.length > 0 || dashboardAppointmentChart.length > 0) && (
      <div className="dashboard-grid dashboard-charts-row">
        {dashboardRevenueChart.length > 0 && (
          <div className="dashboard-card dashboard-chart-card">
            <div className="card-header">
              <h3>
                <i className="fa-solid fa-chart-column"></i> Collections (7 days)
              </h3>
            </div>
            <div className="card-body">
              <div className="dashboard-mini-chart" aria-label="Daily collections">
                {(() => {
                  const maxR = Math.max(...dashboardRevenueChart.map((d) => d.revenue), 1);
                  return dashboardRevenueChart.map((d, i) => (
                    <div key={i} className="dashboard-mini-chart-col" title={`${d.date}: ৳${d.revenue}`}>
                      <div className="dashboard-mini-chart-plot">
                        <div
                          className="dashboard-mini-chart-bar dashboard-mini-chart-bar--revenue"
                          style={{ height: `${Math.max(8, (d.revenue / maxR) * 100)}%` }}
                        />
                      </div>
                      <span className="dashboard-mini-chart-label">{d.date}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
        {dashboardAppointmentChart.length > 0 && (
          <div className="dashboard-card dashboard-chart-card">
            <div className="card-header">
              <h3>
                <i className="fa-solid fa-chart-simple"></i> Appointments (7 days)
              </h3>
            </div>
            <div className="card-body">
              <div className="dashboard-mini-chart" aria-label="Daily appointment count">
                {(() => {
                  const maxC = Math.max(...dashboardAppointmentChart.map((d) => d.count), 1);
                  return dashboardAppointmentChart.map((d, i) => (
                    <div key={i} className="dashboard-mini-chart-col" title={`${d.date}: ${d.count} appts`}>
                      <div className="dashboard-mini-chart-plot">
                        <div
                          className="dashboard-mini-chart-bar dashboard-mini-chart-bar--appts"
                          style={{ height: `${Math.max(8, (d.count / maxC) * 100)}%` }}
                        />
                      </div>
                      <span className="dashboard-mini-chart-label">{d.date}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    <div className="dashboard-grid">
      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            <i className="fa-solid fa-calendar-day"></i> Today's Appointments
          </h3>
          <button type="button" className="btn-sm" onClick={() => setPracticeNav('appointments')}>
            View All
          </button>
        </div>
        <div className="card-body">
          {todayAppointments.length === 0 ? (
            <div className="empty-state">
              <p style={{ position: 'relative', zIndex: 1 }}>No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="appointment-list">
              {todayAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="appointment-item">
                  <div className="apt-time">{apt.time}</div>
                  <div className="apt-info">
                    <strong>{apt.patientName}</strong>
                    <span>{apt.type}</span>
                  </div>
                  <span className={`apt-status status-${apt.status.toLowerCase()}`}>{apt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            <i className="fa-solid fa-user-plus"></i> Recent Patients
          </h3>
          <button type="button" className="btn-sm" onClick={() => setPracticeNav('patients')}>
            View All
          </button>
        </div>
        <div className="card-body">
          {(dashboardRecentPatients ?? patients).length === 0 ? (
            <div className="empty-state">
              <p style={{ position: 'relative', zIndex: 1 }}>No patients registered yet</p>
            </div>
          ) : (
            <div className="patient-list-mini">
              {(dashboardRecentPatients ?? [...patients].sort((a, b) => b.createdAt - a.createdAt)).slice(0, 5).map((p) => (
                <div key={p.id} className="patient-item-mini" onClick={() => selectPatientForView(p)} role="presentation">
                  <div className="patient-avatar">{p.name.charAt(0).toUpperCase()}</div>
                  <div className="patient-info-mini">
                    <strong>{p.name}</strong>
                    <span>{p.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            <i className="fa-solid fa-flask-vial"></i> Pending Lab Work
          </h3>
          <button type="button" className="btn-sm" onClick={() => setPracticeNav('lab')}>
            View All
          </button>
        </div>
        <div className="card-body">
          {labOrders.filter((l) => l.status !== 'DELIVERED').length === 0 ? (
            <div className="empty-state">
              <p style={{ position: 'relative', zIndex: 1 }}>No pending lab orders</p>
            </div>
          ) : (
            <div className="lab-list-mini">
              {labOrders
                .filter((l) => l.status !== 'DELIVERED')
                .slice(0, 5)
                .map((l) => (
                  <div key={l.id} className="lab-item-mini">
                    <span className="lab-type">{l.workType}</span>
                    <span style={{ color: 'var(--neo-text-secondary)' }}>{l.patientName}</span>
                    <span className={`lab-status status-${l.status.toLowerCase()}`}>{l.status}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="quick-actions">
      <h3>
        <i className="fa-solid fa-bolt-lightning"></i> Quick Actions
      </h3>
      <div className="quick-actions-grid">
        <button type="button" className="quick-action-btn" onClick={() => setPracticeNav('patients')}>
          <i className="fa-solid fa-user-plus"></i>
          <span>Add Patient</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => startNewPrescriptionForPatient(null)}>
          <i className="fa-solid fa-prescription"></i>
          <span>New Prescription</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => setPracticeNav('appointments')}>
          <i className="fa-solid fa-calendar-plus"></i>
          <span>Schedule Appointment</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => setPracticeNav('billing')}>
          <i className="fa-solid fa-credit-card"></i>
          <span>Create Invoice</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => setPracticeNav('lab')}>
          <i className="fa-solid fa-flask-vial"></i>
          <span>Lab Order</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => setPracticeNav('sms')}>
          <i className="fa-solid fa-paper-plane"></i>
          <span>Send SMS</span>
        </button>
      </div>
    </div>
  </div>
);
