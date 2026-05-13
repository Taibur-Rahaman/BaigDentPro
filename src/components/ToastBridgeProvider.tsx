/* eslint-disable react-refresh/only-export-components -- module exports provider + hook */
import React, { createContext, useContext, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';

type ToastBridgeValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastBridgeContext = createContext<ToastBridgeValue | null>(null);

export function ToastBridgeProvider({ children }: { children: React.ReactNode }) {
  const { showSuccess, showError, ToastViewport } = useToast();
  const value = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError]);
  return (
    <ToastBridgeContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 10050, maxWidth: 420 }} aria-live="polite">
        <ToastViewport />
      </div>
    </ToastBridgeContext.Provider>
  );
}

export function useToastBridge(): ToastBridgeValue {
  const ctx = useContext(ToastBridgeContext);
  if (!ctx) {
    throw new Error('useToastBridge must be used within ToastBridgeProvider');
  }
  return ctx;
}
