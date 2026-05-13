import { useCallback, useMemo, useState } from 'react';
import type { AvailabilityRule, Operatory } from '@/types/calendarEnterprise';

const DEMO_CLINIC = 'demo-clinic';

/** Operatory CRUD + availability rule list — local-first until persistence API lands. */
export function useOperatoryView(initial?: { operatories?: Operatory[]; rules?: AvailabilityRule[] }) {
  const [operatories, setOperatories] = useState<Operatory[]>(
    initial?.operatories ??
      [
        { id: 'op-1', clinicId: DEMO_CLINIC, name: 'Operatory 1', code: 'OP1', isActive: true, defaultSlotMinutes: 30 },
        { id: 'op-2', clinicId: DEMO_CLINIC, name: 'Operatory 2', code: 'OP2', isActive: true, defaultSlotMinutes: 30 },
        { id: 'op-3', clinicId: DEMO_CLINIC, name: 'Hygiene', code: 'HY1', isActive: true, defaultSlotMinutes: 45 },
      ]
  );

  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>(
    initial?.rules ??
      [1, 2, 3, 4, 5].map((wd) => ({
        id: `rule-${wd}`,
        clinicId: DEMO_CLINIC,
        weekday: wd as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startMinutes: 8 * 60,
        endMinutes: 18 * 60,
      }))
  );

  const addOperatory = useCallback((o: Omit<Operatory, 'id'> & { id?: string }) => {
    const id = o.id ?? `op-${crypto.randomUUID?.() ?? String(Date.now())}`;
    setOperatories((prev) => [...prev, { ...o, id }]);
  }, []);

  const updateOperatory = useCallback((id: string, patch: Partial<Operatory>) => {
    setOperatories((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const removeOperatory = useCallback((id: string) => {
    setOperatories((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addAvailabilityRule = useCallback((rule: AvailabilityRule) => {
    setAvailabilityRules((prev) => [...prev, rule]);
  }, []);

  const byId = useMemo(() => new Map(operatories.map((o) => [o.id, o])), [operatories]);

  return {
    clinicId: DEMO_CLINIC,
    operatories,
    operatoriesById: byId,
    availabilityRules,
    addOperatory,
    updateOperatory,
    removeOperatory,
    addAvailabilityRule,
    setAvailabilityRules,
  };
}
