import React from 'react';
import { AdminAuditLogsPage } from './AdminAuditLogsPage';

/** Security hub: audit-focused view (rate limits & fraud signals stay server-side). */
export const AdminSecurityCenterPage: React.FC = () => (
  <div className="tenant-page">
    <div className="tenant-page-header">
      <h1>Security center</h1>
      <p className="tenant-page-lead">
        Structured audit stream from <code>/api/admin/audit-logs</code>. Cross-tenant SUPER_ADMIN scope follows JWT + impersonation rules
        enforced in middleware.
      </p>
    </div>
    <AdminAuditLogsPage hideIntro />
  </div>
);
