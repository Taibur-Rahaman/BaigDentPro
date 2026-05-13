import React, { createContext, useContext } from 'react';
import type { PracticeWorkspaceControllerModel } from '@/hooks/view/usePracticeWorkspaceControllerModel';

const PracticeWorkspaceViewContext = createContext<PracticeWorkspaceControllerModel | null>(null);

export function PracticeWorkspaceViewProvider({
  value,
  children,
}: {
  value: PracticeWorkspaceControllerModel;
  children: React.ReactNode;
}) {
  return <PracticeWorkspaceViewContext.Provider value={value}>{children}</PracticeWorkspaceViewContext.Provider>;
}

export function usePracticeWorkspaceView(): PracticeWorkspaceControllerModel {
  const ctx = useContext(PracticeWorkspaceViewContext);
  if (!ctx) {
    throw new Error('usePracticeWorkspaceView must be used within PracticeWorkspaceViewProvider');
  }
  return ctx;
}
