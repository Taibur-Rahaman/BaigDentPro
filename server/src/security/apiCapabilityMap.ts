import type { Capability } from './capabilities.js';

/** Human-readable overlay map (server routes). Keep in sync when adding guarded endpoints. */
export type ApiCapabilityEntry = {
  method: string;
  pathGlob: string;
  capabilities: Capability[];
  notes?: string;
};

/** Declarative reference only — enforced in routers via `requireCapability`; not auto-applied middleware. */
export const API_CAPABILITY_REGISTRY: ApiCapabilityEntry[] = [
  { method: '*', pathGlob: '/api/auth/*', capabilities: [], notes: 'Own auth/session flow' },

  // DPMS aggregates (mounted under global auth + firewall)
  {
    method: 'USE',
    pathGlob: '/api/dashboard/*',
    capabilities: ['dpms:access'],
    notes: 'Router-level `router.use` on dashboard routes',
  },
  {
    method: 'GET',
    pathGlob: '/api/dashboard/revenue-chart',
    capabilities: ['dpms:analytics:advanced'],
  },
  {
    method: 'GET',
    pathGlob: '/api/dashboard/appointment-chart',
    capabilities: ['dpms:analytics:advanced'],
  },
  {
    method: 'GET',
    pathGlob: '/api/dashboard/treatment-stats',
    capabilities: ['dpms:analytics:advanced'],
  },
  {
    method: 'GET',
    pathGlob: '/api/dashboard/doctor-revenue',
    capabilities: ['dpms:analytics:advanced'],
  },
  {
    method: 'GET',
    pathGlob: '/api/dashboard/daily-closing',
    capabilities: ['dpms:billing:read'],
  },

  {
    method: 'GET',
    pathGlob: '/api/activity/timeline',
    capabilities: ['dpms:access', 'dpms:analytics:advanced'],
  },

  {
    method: 'POST',
    pathGlob: '/api/admin/users',
    capabilities: ['clinic:users:manage'],
    notes: 'Clinic admin panel + platform admin when scoped',
  },
  {
    method: 'PUT',
    pathGlob: '/api/admin/users/:id',
    capabilities: ['clinic:users:manage'],
  },

  {
    method: 'GET',
    pathGlob: '/api/products',
    capabilities: ['shop:products:read'],
    notes: 'Plus `requireFeature`, subscription, SAAS_TENANT role',
  },
  {
    method: 'GET',
    pathGlob: '/api/products/:id',
    capabilities: ['shop:products:read'],
  },
  {
    method: 'POST',
    pathGlob: '/api/products',
    capabilities: ['shop:products:manage'],
  },
  {
    method: 'PUT',
    pathGlob: '/api/products/:id',
    capabilities: ['shop:products:manage'],
  },
  {
    method: 'DELETE',
    pathGlob: '/api/products/:id',
    capabilities: ['shop:products:manage'],
  },

  {
    method: 'GET',
    pathGlob: '/api/orders',
    capabilities: ['shop:orders:read'],
  },
  {
    method: 'GET',
    pathGlob: '/api/orders/:id',
    capabilities: ['shop:orders:read'],
  },
  {
    method: 'POST',
    pathGlob: '/api/orders',
    capabilities: ['shop:orders:manage'],
  },
  {
    method: 'DELETE',
    pathGlob: '/api/orders/:id',
    capabilities: ['shop:orders:manage'],
  },

  // Super Admin (already `SUPER_ADMIN` role; capabilities are additive for future delegated ops)
  {
    method: 'PUT',
    pathGlob: '/api/super-admin/doctors/:id',
    capabilities: ['clinic:doctors:manage'],
  },
  {
    method: 'POST',
    pathGlob: '/api/super-admin/demo/reset',
    capabilities: ['system:demo:reset'],
  },
  {
    method: 'GET',
    pathGlob: '/api/super-admin/capabilities/catalog',
    capabilities: ['system:admin'],
  },
  {
    method: 'GET',
    pathGlob: '/api/super-admin/clinics/:clinicId/capability-overrides',
    capabilities: ['system:admin'],
  },
  {
    method: 'PUT',
    pathGlob: '/api/super-admin/clinics/:clinicId/capability-overrides',
    capabilities: ['system:admin'],
  },

  // Clinical / workflow / finance (default: global firewall + `clinicalRbac` / `productFeatureGate` — see route modules)
  {
    method: '*',
    pathGlob: '/api/patients*',
    capabilities: ['dpms:access'],
    notes: 'Fine-grained patient read/write still enforced in domain handlers',
  },
  {
    method: '*',
    pathGlob: '/api/appointments*',
    capabilities: ['dpms:access'],
    notes: 'Appointment write rules in workflow + clinical RBAC',
  },
  {
    method: '*',
    pathGlob: '/api/prescriptions*',
    capabilities: ['dpms:access'],
    notes: 'Rx gated by `digital_prescription` feature + clinical RBAC',
  },
  {
    method: '*',
    pathGlob: '/api/lab*',
    capabilities: ['dpms:access'],
    notes: 'Lab tracking feature + `dpms:lab:access` where applied',
  },
  {
    method: '*',
    pathGlob: '/api/invoices*',
    capabilities: ['dpms:access'],
    notes: 'Billing feature + finance handlers',
  },
  {
    method: '*',
    pathGlob: '/api/billing*',
    capabilities: [],
    notes: 'Mixed public webhooks + authenticated finance — no single capability',
  },
  {
    method: '*',
    pathGlob: '/api/clinic*',
    capabilities: ['dpms:access'],
    notes: 'Workspace routes; some sub-paths add admin caps in handlers',
  },
  {
    method: '*',
    pathGlob: '/api/settings*',
    capabilities: ['dpms:access'],
  },
  {
    method: '*',
    pathGlob: '/api/communication*',
    capabilities: ['dpms:access'],
  },
  {
    method: '*',
    pathGlob: '/api/upload*',
    capabilities: ['dpms:access'],
    notes: 'Often combined with route-specific checks',
  },
  {
    method: '*',
    pathGlob: '/api/shop*',
    capabilities: ['shop:catalog:read'],
    notes: 'Public/limited shop catalog; checkout may differ',
  },
  {
    method: '*',
    pathGlob: '/api/invite*',
    capabilities: [],
    notes: 'Invite preview/accept are unauthenticated; staff invite create is authenticated separately',
  },
  {
    method: '*',
    pathGlob: '/api/patient-portal*',
    capabilities: [],
    notes: 'Patient JWT — separate auth kind',
  },
];
