import { coreApiRequest } from '@/lib/core/coreHttpClient';

export type ClinicSettings = {
  clinicId: string;
  clinicName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  useCustomPad: boolean;
  doctorLogo: string;
  printShowHeader: boolean;
  printShowFooter: boolean;
  printMarginTopMm: number;
  printMarginBottomMm: number;
  printMarginLeftMm: number;
  printMarginRightMm: number;
  printLayoutMode: 'medical' | 'hospital';
  /** Word-style boxed page frame (prescription print). Omitted until settings saved once. */
  printPageBorderEnabled?: boolean;
  printBorderWidthPt?: number;
  printBorderMeasureFrom?: 'page_edge' | 'text_margin';
  printBorderOffsetMm?: number;
  printCenterHorizontal?: boolean;
  printCenterVertical?: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: 'center' | 'top' | 'bottom';
  watermarkFontSize: number;
  watermarkRotation: number;
  settingsVersion?: string;
};

export async function coreApiInvitePreview(token: string): Promise<{
  ok: boolean;
  clinicName: string;
  emailMasked: string;
  role: string;
}> {
  return coreApiRequest(`/invite/preview?token=${encodeURIComponent(token)}`, { method: 'GET' });
}

export async function coreApiInviteCreate(body: Record<string, unknown>): Promise<{
  success: boolean;
  invite: unknown;
  acceptUrl: string;
}> {
  return coreApiRequest('/invite', { method: 'POST', body });
}

export async function coreApiInviteAccept(body: Record<string, unknown>): Promise<{ message: string; user: unknown }> {
  return coreApiRequest('/invite/accept', { method: 'POST', body });
}

export async function coreApiSubscriptionUpgrade(body: Record<string, unknown>): Promise<{ success: boolean; data: unknown }> {
  return coreApiRequest('/subscription/upgrade', { method: 'POST', body });
}

export async function coreApiActivityTimeline(params?: {
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: { items: unknown[]; total: number; page: number; limit: number } }> {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit ?? 50));
  return coreApiRequest(`/activity/timeline?${q}`, { method: 'GET' });
}

export async function coreApiBillingStatus(): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return coreApiRequest('/billing/status', { method: 'GET' });
}

export async function coreApiBillingSubscription(): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return coreApiRequest('/billing/subscription', { method: 'GET' });
}

export async function coreApiBillingCheckout(body: {
  planCode?: string;
}): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return coreApiRequest('/billing/checkout', { method: 'POST', body });
}

export async function coreApiAdminSubscriptionsList(): Promise<{ success: boolean; data: unknown[] }> {
  return coreApiRequest('/admin/subscriptions', { method: 'GET' });
}

export async function coreApiAdminUpgradePlan(body: {
  clinicId: string;
  planName: 'PLATINUM' | 'PREMIUM' | 'LUXURY' | 'FREE';
}): Promise<{ ok: boolean; clinicId: string; planName: string }> {
  return coreApiRequest('/admin/upgrade-plan', { method: 'PUT', body });
}

export async function coreApiAdminDisableClinic(body: {
  clinicId: string;
  disabled: boolean;
}): Promise<{ ok: boolean; clinicId: string; isActive: boolean }> {
  return coreApiRequest('/admin/disable-clinic', { method: 'POST', body });
}

export async function coreApiSettingsGet(): Promise<ClinicSettings> {
  return coreApiRequest('/settings', { method: 'GET' });
}

export async function coreApiSettingsUpdate(
  body: (Partial<Omit<ClinicSettings, 'clinicId'>> & { ifMatchVersion?: string })
): Promise<ClinicSettings> {
  return coreApiRequest('/settings', { method: 'PUT', body });
}
