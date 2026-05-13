import { useCallback, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import type { AppUser } from '@/types/appUser';
import type { ClinicSubscriptionPayload } from '@/types/clinicWorkspace';

/** Subscription workspace — SaaS plans settle via manual WhatsApp (`POST /api/payment/manual/initiate`). */
export function useClinicSubscriptionWorkspaceView(user: AppUser | null | undefined) {
  const [payload, setPayload] = useState<ClinicSubscriptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogPlan, setCatalogPlan] = useState('PREMIUM');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const [waLoading, setWaLoading] = useState(false);
  const [waMsg, setWaMsg] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClinicAdmin = user?.role === 'CLINIC_ADMIN';

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.subscription();
      setPayload(res);
    } catch (e) {
      setPayload(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const openWhatsAppCheckout = useCallback(async () => {
    setWaMsg(null);
    setWaLoading(true);
    try {
      const planCode = catalogPlan.trim().toUpperCase();
      const res = await api.payment.manualInitiate({ planCode });
      const url = res.whatsappUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
      setWaMsg(
        `Payment request saved (${res.paymentMethod}). Complete payment in WhatsApp. Our team will mark it PAID — your subscription activates after verification. Reference ID: ${res.paymentId}`
      );
    } catch (e) {
      setWaMsg(userMessageFromUnknown(e));
    } finally {
      setWaLoading(false);
    }
  }, [catalogPlan]);

  const runSuperUpgrade = async () => {
    setUpgradeMsg(null);
    setUpgrading(true);
    try {
      const clinicId = payload?.clinic?.id;
      await api.subscription.upgrade({
        planName: catalogPlan.trim(),
        durationDays: 365,
        ...(isSuperAdmin && clinicId ? { clinicId } : {}),
      });
      setUpgradeMsg('Plan updated.');
      await load();
    } catch (e) {
      setUpgradeMsg(userMessageFromUnknown(e));
    } finally {
      setUpgrading(false);
    }
  };

  const sub = payload?.subscription;
  const clinic = payload?.clinic;

  return {
    payload,
    loading,
    error,
    reload: load,
    catalogPlan,
    setCatalogPlan,
    upgrading,
    upgradeMsg,
    isSuperAdmin,
    isClinicAdmin,
    waLoading,
    waMsg,
    openWhatsAppCheckout,
    runSuperUpgrade,
    sub,
    clinic,
  };
}
