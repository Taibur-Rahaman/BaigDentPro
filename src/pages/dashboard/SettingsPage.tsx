import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Settings</h1>
        <p className="tenant-page-lead">Account and workspace preferences.</p>
      </div>
      <div className="tenant-card" style={{ padding: '1.25rem' }}>
        <p style={{ margin: 0, color: 'var(--neo-text-muted, #64748b)' }}>
          Signed in as <strong>{user?.email}</strong>
          {user?.role ? (
            <>
              {' '}
              · role <code>{user.role}</code>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
};
