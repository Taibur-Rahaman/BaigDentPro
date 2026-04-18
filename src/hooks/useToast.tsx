import React, { useCallback, useEffect, useRef, useState } from 'react';

type ToastState = { message: string; variant: 'success' | 'error' } | null;

export function useToast(durationMs = 3200) {
  const [toast, setToast] = useState<ToastState>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setToast(null);
  }, []);

  const scheduleHide = useCallback((ms: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setToast(null);
    }, ms);
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      setToast({ message, variant: 'success' });
      scheduleHide(durationMs);
    },
    [durationMs, scheduleHide]
  );

  const showError = useCallback(
    (message: string) => {
      setToast({ message, variant: 'error' });
      scheduleHide(Math.max(durationMs, 4500));
    },
    [durationMs, scheduleHide]
  );

  const ToastViewport = useCallback(() => {
    if (!toast) return null;
    const isErr = toast.variant === 'error';
    return (
      <div
        className="toast-notification"
        role="status"
        style={
          isErr
            ? {
                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.25) 0%, rgba(248, 113, 113, 0.06) 100%)',
                border: '1px solid rgba(248, 113, 113, 0.5)',
                color: '#fecaca',
              }
            : undefined
        }
      >
        <i className={isErr ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-check-circle'} aria-hidden />
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            marginLeft: 8,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.85,
            fontSize: '1rem',
          }}
        >
          ×
        </button>
      </div>
    );
  }, [toast, dismiss]);

  return { toast, showSuccess, showError, dismiss, ToastViewport };
}
