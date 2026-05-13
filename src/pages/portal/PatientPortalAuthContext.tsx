import React, { createContext, useContext } from 'react';
import { usePatientPortalAuthView } from '@/hooks/view/usePatientPortalAuthView';

const PatientPortalAuthContext = createContext<ReturnType<typeof usePatientPortalAuthView> | null>(null);

export const PatientPortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = usePatientPortalAuthView();
  return <PatientPortalAuthContext.Provider value={value}>{children}</PatientPortalAuthContext.Provider>;
};

/** Context consumer — colocated with provider (Fast Refresh allows only components in default export files). */
// eslint-disable-next-line react-refresh/only-export-components -- context + hook pairing
export function usePatientPortalAuth(): ReturnType<typeof usePatientPortalAuthView> {
  const v = useContext(PatientPortalAuthContext);
  if (!v) throw new Error('usePatientPortalAuth must be used under PatientPortalAuthProvider');
  return v;
}
