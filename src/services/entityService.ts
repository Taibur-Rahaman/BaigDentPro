/**
 * Base paths for the public REST API mounted on the Node server.
 * Always `/api/...` (no full URLs here — origin comes from `VITE_API_URL` + `apiRequest`).
 */
export const apiRoutes = {
  products: '/api/products',
  orders: '/api/orders',
  /** Identity + tenant summary — use `/me` only (no duplicate `/users/me`). */
  auth: '/api/auth',
} as const;
