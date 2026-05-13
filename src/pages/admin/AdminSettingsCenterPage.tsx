import React from 'react';

/** Deployment-facing settings inventory (SMTP, storage, keys) remain on the API host `.env`; this UI documents that contract. */
export const AdminSettingsCenterPage: React.FC = () => (
  <div className="tenant-page">
    <div className="tenant-page-header">
      <h1>Settings center</h1>
      <p className="tenant-page-lead">
        Runtime configuration for BaigDentPro is intentionally server-side (<code>server/.env</code>). Editing secrets from the SPA would widen the
        attack surface; operators change values through your deployment pipeline or secure host SSH.
      </p>
    </div>
    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {[
        { title: 'SMTP / outbound email', detail: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS' },
        { title: 'Storage / uploads', detail: 'Supabase bucket + service role (`SUPABASE_*` server keys)' },
        { title: 'Auth & sessions', detail: 'JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_DAYS' },
        { title: 'Database', detail: 'DATABASE_URL (+ DIRECT_URL for Prisma Migrate)' },
        { title: 'CORS / SPA origin', detail: 'FRONTEND_URL comma-separated origins' },
      ].map((c) => (
        <section key={c.title} className="dashboard-card tenant-card" style={{ minHeight: 120 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>{c.title}</h3>
          </div>
          <div className="card-body">
            <code style={{ fontSize: 12, wordBreak: 'break-word' }}>{c.detail}</code>
          </div>
        </section>
      ))}
    </div>
  </div>
);
