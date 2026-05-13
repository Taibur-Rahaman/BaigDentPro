import React from 'react';

/** Shown after automatic sign-out from inactivity — informational, not an error state. */
export const IdleSessionReturnedModal: React.FC<{ open: boolean; onDismiss: () => void }> = ({
  open,
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-session-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.45)',
        zIndex: 11000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 50px rgba(15,23,42,0.2)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(13, 148, 136, 0.12)',
              display: 'grid',
              placeItems: 'center',
              color: '#0d9488',
            }}
            aria-hidden
          >
            <i className="fa-solid fa-clock" />
          </div>
          <div>
            <h3 id="idle-session-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
              Please sign in again
            </h3>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
              <strong style={{ color: '#334155' }}>Reason:</strong> you were inactive for over an hour. For security, your
              session was ended automatically.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="neo-btn neo-btn-primary" onClick={onDismiss}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
