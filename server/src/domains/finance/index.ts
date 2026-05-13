/**
 * Finance domain barrels — split patient AR vs platform SaaS; no cross-imports between them here.
 */
export { invoiceRoutes } from './patientAccountsReceivable.js';
export {
  billingRoutes,
  subscriptionRoutes,
  paymentRoutes,
  subscriptionPaymentsAdminRoutes,
} from './platformSaas.js';
