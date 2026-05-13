import React, { useEffect, useMemo, useState } from 'react';
import {
  type ErrorReportPayload,
  getLatestErrorPayload,
  isIgnorableErrorReport,
  isSessionExpiryPayload,
  openWhatsAppErrorReport,
  subscribeToErrors,
} from '@/lib/errorHandler';
import { clearCoreApiSession } from '@/lib/core/coreAuthStorage';

function sessionExpiryMessage(): string {
  return 'Your session has expired. Please sign in again.';
}

function generalFriendlyMessage(payload: ErrorReportPayload): string {
  if (payload.code === 'OFFLINE') {
    return 'Your browser reports no internet connection. Check Wi‑Fi or Ethernet, then try again.';
  }
  const msg = (payload.message || '').toLowerCase();
  if (
    payload.statusCode === 0 ||
    payload.code === 'NETWORK_ERROR' ||
    payload.code === 'FETCH_ERROR' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror')
  ) {
    return 'Cannot reach the BaigDentPro API from this browser (often the backend is not running on localhost). Check your connection and API URL, or retry after starting the server.';
  }
  return 'Something didn’t work on our side. Please try again. If it keeps happening, use Send via WhatsApp.';
}

export const GlobalErrorModal: React.FC = () => {
  const [active, setActive] = useState<ErrorReportPayload | null>(() => {
    const p = getLatestErrorPayload();
    return p && !isIgnorableErrorReport(p) ? p : null;
  });

  useEffect(() => {
    return subscribeToErrors((payload) => {
      if (!isIgnorableErrorReport(payload)) setActive(payload);
    });
  }, []);

  const isOfflineNotice = active?.code === 'OFFLINE';
  const isSession = active ? isSessionExpiryPayload(active) && !isOfflineNotice : false;

  const bodyText = useMemo(() => {
    if (!active) return '';
    if (isOfflineNotice) {
      return generalFriendlyMessage(active);
    }
    if (isSession) {
      return sessionExpiryMessage();
    }
    return generalFriendlyMessage(active);
  }, [active, isOfflineNotice, isSession]);

  const title = useMemo(() => {
    if (!active) return '';
    if (isOfflineNotice) return 'No connection';
    if (isSession) return 'Session Expired';
    return 'Something went wrong';
  }, [active, isOfflineNotice, isSession]);

  if (!active) return null;

  const handleSignInAgain = () => {
    setActive(null);
    clearCoreApiSession(true);
  };

  const handleRetry = () => {
    setActive(null);
    window.location.reload();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-error-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.55)',
        zIndex: 11000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
          padding: 16,
        }}
      >
        <h3 id="global-error-title" style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
          {title}
        </h3>
        <p style={{ margin: '10px 0 0', color: '#334155', lineHeight: 1.5 }}>{bodyText}</p>

        {isSession ? (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="neo-btn neo-btn-primary" onClick={handleSignInAgain}>
              Sign In Again
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={() => setActive(null)}>
              Close
            </button>
            <button type="button" className="neo-btn neo-btn-secondary" onClick={handleRetry}>
              Retry
            </button>
            <button
              type="button"
              className="neo-btn neo-btn-primary"
              onClick={() => {
                openWhatsAppErrorReport(active);
              }}
            >
              Send via WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
