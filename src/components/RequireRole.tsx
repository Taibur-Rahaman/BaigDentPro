import React from 'react';
import { RoleGate } from '@/routes/RoleGate';
import type { RoleKeyword } from '@/lib/roles';

type RequireRoleProps = {
  /** Same semantics as `RoleGate` `allow`: keywords (`ADMIN`, …) or literal DB roles. */
  roles: Array<RoleKeyword | string>;
  children: React.ReactNode;
};

/** Route-style guard matching the requested `<RequireRole roles={…}>` API. */
export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => (
  <RoleGate allow={roles}>{children}</RoleGate>
);
