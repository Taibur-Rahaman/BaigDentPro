import React from 'react';
import { PracticeWorkspaceController } from '@/hooks/view/PracticeWorkspaceController';

export interface PracticeWorkspaceShellProps {
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userClinicId?: string;
  currentUserId?: string;
}

/**
 * Practice route shell: mounts the workspace controller. Orchestration stays in the hook/controller layer.
 */
export const PracticeWorkspaceShell: React.FC<PracticeWorkspaceShellProps> = (props) => (
  <PracticeWorkspaceController {...props} />
);
