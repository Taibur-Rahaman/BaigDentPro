import React from 'react';

export type ApiErrorProps = {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export const ApiError: React.FC<ApiErrorProps> = ({
  message,
  title = 'We could not reach the server',
  onRetry,
  retryLabel = 'Retry',
}) => (
  <div
    role="alert"
    aria-live="polite"
    style={{
      padding: '1rem 1.25rem',
      marginBottom: '1rem',
      borderRadius: 12,
      background: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.45)',
      color: '#fecaca',
    }}
  >
    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 600, color: '#fee2e2' }}>{title}</h3>
    <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', lineHeight: 1.45, opacity: 0.95 }}>{message}</p>
    {onRetry ? (
      <button type="button" className="neo-btn neo-btn-secondary" onClick={onRetry}>
        <i className="fa-solid fa-rotate-right" aria-hidden /> {retryLabel}
      </button>
    ) : null}
  </div>
);
