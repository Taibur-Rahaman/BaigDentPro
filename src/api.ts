import { getApiBaseUrl, HTML_API_ERROR } from '@/config/api';
import { getSupabaseAccessToken } from '@/lib/supabaseClient';

const DEBUG_API =
  import.meta.env.DEV || (import.meta.env as { VITE_DEBUG_API?: string }).VITE_DEBUG_API === '1';

/**
 * Base for legacy `api` client: `{getApiBaseUrl()}/api` or same-origin `/api` (dev / non-production modes only).
 * Route paths are like `/auth/login` (mounted under `/api` on the server).
 */
function legacyApiRoot(): string {
  const origin = getApiBaseUrl();
  if (origin) return `${origin}/api`;
  return '/api';
}

function assertNoSameOriginFallbackInProductionMode(): void {
  if (!import.meta.env.PROD || import.meta.env.MODE !== 'production') return;
  const origin = getApiBaseUrl();
  if (!origin) {
    throw new Error(
      '[BaigDentPro] API origin is empty in a production-mode bundle. Set VITE_API_URL at build time.'
    );
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;
  private sessionId: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.token = localStorage.getItem('baigdentpro:token');
    this.sessionId = localStorage.getItem('baigdentpro:sessionId') || this.generateSessionId();
    localStorage.setItem('baigdentpro:sessionId', this.sessionId);
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('baigdentpro:token', token);
    } else {
      localStorage.removeItem('baigdentpro:token');
    }
  }

  getToken() {
    return this.token;
  }

  /** Rotate refresh token and replace access token; returns false if refresh is missing or invalid. */
  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    const rawRt = typeof window !== 'undefined' ? window.localStorage.getItem('baigdentpro:refreshToken') : null;
    const rt = rawRt?.trim();
    if (!rt) return false;

    const run = (async (): Promise<boolean> => {
      try {
        assertNoSameOriginFallbackInProductionMode();
        const API_URL = legacyApiRoot();
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': this.sessionId,
          },
          body: JSON.stringify({ refreshToken: rt }),
        });
        const text = await response.text();
        if (!response.ok) {
          return false;
        }
        const result = JSON.parse(text) as { token?: string; refreshToken?: string };
        if (result.token) {
          this.setToken(result.token);
        }
        if (result.refreshToken && typeof window !== 'undefined') {
          window.localStorage.setItem('baigdentpro:refreshToken', result.refreshToken);
        }
        return Boolean(result.token);
      } catch {
        return false;
      }
    })();

    this.refreshPromise = run;
    try {
      return await run;
    } finally {
      this.refreshPromise = null;
    }
  }

  private clearAuthStorage(): void {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('baigdentpro:user');
        window.localStorage.removeItem('baigdentpro:refreshToken');
        window.dispatchEvent(new CustomEvent('baigdentpro:auth-expired'));
      } catch {
        /* ignore */
      }
    }
  }

  async request<T>(endpoint: string, options: ApiOptions = {}, retryOnExpired = true): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    assertNoSameOriginFallbackInProductionMode();
    const API_URL = legacyApiRoot();

    if (DEBUG_API) {
      let baseLabel: string;
      try {
        baseLabel = getApiBaseUrl() || '(same-origin /api)';
      } catch (e) {
        baseLabel = e instanceof Error ? e.message : String(e);
      }
      console.log('API BASE:', baseLabel);
      console.log('API Request:', `${API_URL}${endpoint}`);
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-session-id': this.sessionId,
      ...headers,
    };

    if (!requestHeaders['Authorization']) {
      const appToken = this.token?.trim();
      const bearer = appToken || (await getSupabaseAccessToken()) || '';
      if (bearer) {
        requestHeaders['Authorization'] = `Bearer ${bearer}`;
      }
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          'Cannot reach the API. Deploy the backend (Node + PostgreSQL) and set Hostinger build env VITE_API_URL to your API base if it is not on the same origin (e.g. https://api.yourdomain.com/api).'
        );
      }
      throw err;
    }

    const text = await response.text();
    const requestUrl = `${API_URL}${endpoint}`;
    const isHtml =
      (response.headers.get('content-type') || '').toLowerCase().includes('text/html') ||
      /^\s*</.test(text);

    if (isHtml) {
      console.error('❌ HTML RESPONSE DETECTED:', {
        url: requestUrl,
        preview: text.slice(0, 200),
      });
      throw new Error(HTML_API_ERROR);
    }

    if (!response.ok) {
      const status = response.status;
      let message = 'Request failed';
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (typeof parsed.error === 'string') message = parsed.error;
      } catch {
        if (text.length > 0 && text.length < 400) {
          message = text;
        }
      }

      const errorText = String(message).toLowerCase();
      const isExpired =
        status === 401 &&
        this.token &&
        (errorText.includes('token expired') || errorText.includes('jwt expired'));

      if (isExpired && retryOnExpired && endpoint !== '/auth/refresh') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, false);
        }
        this.clearAuthStorage();
      }

      // If the token is invalid/expired, clear auth state but don't hard-redirect.
      if (status === 401 && this.token) {
        if (
          errorText.includes('invalid token') ||
          errorText.includes('no token provided') ||
          errorText.includes('user not found') ||
          errorText.includes('unauthorized') ||
          errorText.includes('token expired') ||
          errorText.includes('refresh token')
        ) {
          if (!isExpired || !retryOnExpired) {
            this.setToken(null);
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.removeItem('baigdentpro:user');
                window.localStorage.removeItem('baigdentpro:refreshToken');
                if (errorText.includes('refresh token')) {
                  window.dispatchEvent(new CustomEvent('baigdentpro:auth-expired'));
                }
              } catch {
                // ignore storage errors
              }
            }
          }
        }
      }

      if (status === 403 && this.token) {
        const staleText = String(message).toLowerCase();
        if (
          staleText.includes('session is outdated') ||
          staleText.includes('session is out of date') ||
          staleText.includes('please sign in again')
        ) {
          this.clearAuthStorage();
        }
      }

      throw new Error(message);
    }

    if (!text.trim()) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      if (DEBUG_API) {
        console.warn('Non-JSON response preview:', text.slice(0, 200));
      }
      throw new Error(
        'The server returned an invalid JSON body. If this persists, check the API URL and response shape.'
      );
    }
  }

  auth = {
    login: async (email: string, password: string) => {
      const result = await this.request<{ user: any; token: string; refreshToken?: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      this.setToken(result.token);
      if (result.refreshToken) {
        localStorage.setItem('baigdentpro:refreshToken', result.refreshToken);
      }
      return result;
    },

    register: async (data: { email: string; password: string; name: string; clinicName?: string; phone?: string }) => {
      const result = await this.request<{
        user: any;
        token?: string;
        pendingApproval?: boolean;
        message?: string;
      }>('/auth/register', {
        method: 'POST',
        body: data,
      });
      if (result.token) {
        this.setToken(result.token);
      }
      return result;
    },

    /** Instant SaaS tenant (approved + JWT). */
    registerSaas: async (data: { email: string; password: string; name?: string }) => {
      const result = await this.request<{ user: any; token: string; refreshToken?: string }>('/auth/register-saas', {
        method: 'POST',
        body: data,
      });
      this.setToken(result.token);
      if (result.refreshToken) {
        localStorage.setItem('baigdentpro:refreshToken', result.refreshToken);
      }
      return result;
    },

    me: async () => {
      const raw = await this.request<any>('/auth/me');
      if (raw && typeof raw === 'object' && raw.success === true && raw.user) {
        return { ...raw.user, tenant: raw.tenant ?? null };
      }
      return raw;
    },

    /** Rotate refresh token; call after access JWT expires. Does not retry on 401. */
    refreshSession: async () => {
      const rt = localStorage.getItem('baigdentpro:refreshToken')?.trim();
      if (!rt) {
        this.clearAuthStorage();
        throw new Error('No refresh token');
      }
      const result = await this.request<{ user: any; token: string; refreshToken?: string }>(
        '/auth/refresh',
        { method: 'POST', body: { refreshToken: rt } },
        false
      );
      if (result.token) {
        this.setToken(result.token);
      }
      if (result.refreshToken) {
        localStorage.setItem('baigdentpro:refreshToken', result.refreshToken);
      }
      return result;
    },

    /** Revoke all refresh tokens and invalidate access JWTs (requires valid access token). */
    logoutAllDevices: async () => {
      try {
        await this.request<{ success?: boolean }>('/auth/logout-all', { method: 'POST', body: {} }, false);
      } catch {
        /* still clear local session */
      }
      this.clearAuthStorage();
    },

    updateProfile: (data: any) => this.request<any>('/auth/profile', { method: 'PUT', body: data }),

    changePassword: (currentPassword: string, newPassword: string) =>
      this.request<any>('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),

    logout: async () => {
      const refreshToken = localStorage.getItem('baigdentpro:refreshToken') || undefined;
      try {
        await this.request<{ success?: boolean }>('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        /* still clear client session */
      }
      localStorage.removeItem('baigdentpro:refreshToken');
      this.setToken(null);
      localStorage.removeItem('baigdentpro:user');
    },

    /** After Supabase sign-in; server verifies JWT and returns app token. */
    exchangeSupabaseSession: async (accessToken: string) => {
      const result = await this.request<{ user: any; token: string; refreshToken?: string }>('/auth/supabase-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      this.setToken(result.token);
      if (result.refreshToken) {
        localStorage.setItem('baigdentpro:refreshToken', result.refreshToken);
      }
      return result;
    },

    /** Keeps Prisma password hash aligned after Supabase password recovery. */
    syncPrismaPassword: async (accessToken: string, password: string) =>
      this.request<{ message: string }>('/auth/sync-prisma-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { password },
      }),
  };

  patients = {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ patients: any[]; total: number }>(`/patients?${query}`);
    },

    get: (id: string) => this.request<any>(`/patients/${id}`),

    create: (data: any) => this.request<any>('/patients', { method: 'POST', body: data }),

    update: (id: string, data: any) => this.request<any>(`/patients/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) => this.request<any>(`/patients/${id}`, { method: 'DELETE' }),

    updateMedicalHistory: (id: string, data: any) =>
      this.request<any>(`/patients/${id}/medical-history`, { method: 'PUT', body: data }),

    updateDentalChart: (id: string, data: any) =>
      this.request<any>(`/patients/${id}/dental-chart`, { method: 'PUT', body: data }),

    addTreatmentPlan: (id: string, data: any) =>
      this.request<any>(`/patients/${id}/treatment-plans`, { method: 'POST', body: data }),

    updateTreatmentPlan: (id: string, planId: string, data: any) =>
      this.request<any>(`/patients/${id}/treatment-plans/${planId}`, { method: 'PUT', body: data }),

    deleteTreatmentPlan: (id: string, planId: string) =>
      this.request<any>(`/patients/${id}/treatment-plans/${planId}`, { method: 'DELETE' }),

    addTreatmentRecord: (id: string, data: any) =>
      this.request<any>(`/patients/${id}/treatment-records`, { method: 'POST', body: data }),

    addConsent: (id: string, data: any) =>
      this.request<any>(`/patients/${id}/consent`, { method: 'POST', body: data }),
  };

  appointments = {
    list: (params?: { date?: string; startDate?: string; endDate?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.date) query.set('date', params.date);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.status) query.set('status', params.status);
      return this.request<any[]>(`/appointments?${query}`);
    },

    today: () => this.request<any[]>('/appointments/today'),

    upcoming: (limit?: number) => this.request<any[]>(`/appointments/upcoming?limit=${limit || 10}`),

    calendar: (month: number, year: number) =>
      this.request<Record<string, any[]>>(`/appointments/calendar?month=${month}&year=${year}`),

    get: (id: string) => this.request<any>(`/appointments/${id}`),

    create: (data: any) => this.request<any>('/appointments', { method: 'POST', body: data }),

    update: (id: string, data: any) => this.request<any>(`/appointments/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) => this.request<any>(`/appointments/${id}`, { method: 'DELETE' }),

    cancel: (id: string) => this.request<any>(`/appointments/${id}/cancel`, { method: 'POST' }),

    complete: (id: string) => this.request<any>(`/appointments/${id}/complete`, { method: 'POST' }),

    confirm: (id: string) => this.request<any>(`/appointments/${id}/confirm`, { method: 'POST' }),
  };

  prescriptions = {
    list: (params?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ prescriptions: any[]; total: number }>(`/prescriptions?${query}`);
    },

    get: (id: string) => this.request<any>(`/prescriptions/${id}`),

    create: (data: any) => this.request<any>('/prescriptions', { method: 'POST', body: data }),

    update: (id: string, data: any) => this.request<any>(`/prescriptions/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) => this.request<any>(`/prescriptions/${id}`, { method: 'DELETE' }),

    getPDF: (id: string) => `${legacyApiRoot()}/prescriptions/${id}/pdf`,

    sendEmail: (id: string) => this.request<any>(`/prescriptions/${id}/send-email`, { method: 'POST' }),

    sendWhatsApp: (id: string) => this.request<any>(`/prescriptions/${id}/send-whatsapp`, { method: 'POST' }),
  };

  invoices = {
    list: (params?: { patientId?: string; status?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ invoices: any[]; total: number }>(`/invoices?${query}`);
    },

    stats: () => this.request<any>('/invoices/stats'),

    get: (id: string) => this.request<any>(`/invoices/${id}`),

    create: (data: any) => this.request<any>('/invoices', { method: 'POST', body: data }),

    update: (id: string, data: any) => this.request<any>(`/invoices/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) => this.request<any>(`/invoices/${id}`, { method: 'DELETE' }),

    addPayment: (id: string, data: any) => this.request<any>(`/invoices/${id}/payments`, { method: 'POST', body: data }),

    getPDF: (id: string) => `${legacyApiRoot()}/invoices/${id}/pdf`,

    sendEmail: (id: string) => this.request<any>(`/invoices/${id}/send-email`, { method: 'POST' }),

    sendWhatsApp: (id: string) => this.request<any>(`/invoices/${id}/send-whatsapp`, { method: 'POST' }),
  };

  lab = {
    list: (params?: { patientId?: string; status?: string; workType?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.status) query.set('status', params.status);
      if (params?.workType) query.set('workType', params.workType);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ labOrders: any[]; total: number }>(`/lab?${query}`);
    },

    pending: () => this.request<any[]>('/lab/pending'),

    stats: () => this.request<any>('/lab/stats'),

    get: (id: string) => this.request<any>(`/lab/${id}`),

    create: (data: any) => this.request<any>('/lab', { method: 'POST', body: data }),

    update: (id: string, data: any) => this.request<any>(`/lab/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) => this.request<any>(`/lab/${id}`, { method: 'DELETE' }),

    sendToLab: (id: string) => this.request<any>(`/lab/${id}/send-to-lab`, { method: 'POST' }),

    markReady: (id: string) => this.request<any>(`/lab/${id}/mark-ready`, { method: 'POST' }),

    markDelivered: (id: string) => this.request<any>(`/lab/${id}/mark-delivered`, { method: 'POST' }),

    markFitted: (id: string) => this.request<any>(`/lab/${id}/mark-fitted`, { method: 'POST' }),
  };

  shop = {
    products: (params?: { category?: string; search?: string; featured?: boolean; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.featured) query.set('featured', 'true');
      if (params?.page) query.set('page', String(params.page));
      return this.request<{ products: any[]; total: number }>(`/shop/products?${query}`);
    },

    categories: () => this.request<any[]>('/shop/products/categories'),

    product: (slug: string) => this.request<any>(`/shop/products/${slug}`),

    cart: () => this.request<{ sessionId: string; items: any[]; total: number }>('/shop/cart'),

    addToCart: (productId: string, quantity?: number) =>
      this.request<any>('/shop/cart/add', { method: 'POST', body: { productId, quantity } }),

    updateCart: (productId: string, quantity: number) =>
      this.request<any>('/shop/cart/update', { method: 'PUT', body: { productId, quantity } }),

    removeFromCart: (productId: string) => this.request<any>(`/shop/cart/remove/${productId}`, { method: 'DELETE' }),

    clearCart: () => this.request<any>('/shop/cart/clear', { method: 'DELETE' }),

    checkout: (data: any) => this.request<any>('/shop/checkout', { method: 'POST', body: data }),

    order: (orderNo: string) => this.request<any>(`/shop/orders/${orderNo}`),

    ordersByPhone: (phone: string) => this.request<any[]>(`/shop/orders/phone/${phone}`),
  };

  shopAdmin = {
    stats: () => this.request<{
      products: { total: number; active: number; lowStock: number };
      orders: { total: number; pending: number; today: number };
      revenue: { total: number; today: number };
      profit: { total: number };
    }>('/shop/admin/stats'),

    products: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ products: any[]; total: number }>(`/shop/admin/products?${query}`);
    },

    createProduct: (data: {
      name: string;
      description?: string;
      shortDesc?: string;
      price: number;
      comparePrice?: number;
      cost?: number;
      sku?: string;
      barcode?: string;
      category: string;
      images?: string[];
      stock?: number;
      isFeatured?: boolean;
    }) => this.request<any>('/shop/admin/products', { method: 'POST', body: data }),

    updateProduct: (id: string, data: any) =>
      this.request<any>(`/shop/admin/products/${id}`, { method: 'PUT', body: data }),

    deleteProduct: (id: string) =>
      this.request<any>(`/shop/admin/products/${id}`, { method: 'DELETE' }),

    orders: (params?: { status?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      return this.request<{ orders: any[]; total: number }>(`/shop/admin/orders?${query}`);
    },

    updateOrderStatus: (id: string, status: string, trackingNumber?: string) =>
      this.request<any>(`/shop/admin/orders/${id}/status`, {
        method: 'PUT',
        body: { status, trackingNumber },
      }),
  };

  communication = {
    sendSMS: (phone: string, message: string, type?: string) =>
      this.request<any>('/communication/sms/send', { method: 'POST', body: { phone, message, type } }),

    sendAppointmentReminder: (appointmentId: string) =>
      this.request<any>('/communication/sms/appointment-reminder', { method: 'POST', body: { appointmentId } }),

    sendBulkReminders: () => this.request<any>('/communication/sms/bulk-reminder', { method: 'POST' }),

    smsLogs: (page?: number) => this.request<any>(`/communication/sms/logs?page=${page || 1}`),

    sendEmail: (to: string, subject: string, body: string, type?: string) =>
      this.request<any>('/communication/email/send', { method: 'POST', body: { to, subject, body, type } }),

    emailLogs: (page?: number) => this.request<any>(`/communication/email/logs?page=${page || 1}`),

    sendWhatsApp: (phone: string, message: string) =>
      this.request<any>('/communication/whatsapp/send', { method: 'POST', body: { phone, message } }),
  };

  dashboard = {
    stats: () => this.request<any>('/dashboard/stats'),

    today: () => this.request<any>('/dashboard/today'),

    recentPatients: () => this.request<any[]>('/dashboard/recent-patients'),

    revenueChart: (period?: 'daily' | 'monthly') => this.request<any[]>(`/dashboard/revenue-chart?period=${period || 'monthly'}`),

    appointmentChart: () => this.request<any[]>('/dashboard/appointment-chart'),

    treatmentStats: () => this.request<any[]>('/dashboard/treatment-stats'),
  };

  admin = {
    users: (params?: { search?: string; role?: string; page?: number; limit?: number; clinicId?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.role) query.set('role', params.role);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      return this.request<{ users: any[]; total: number; page?: number; limit?: number }>(`/admin/users?${query}`);
    },

    createUser: (data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role?: 'DOCTOR' | 'CLINIC_ADMIN';
      clinicId?: string;
    }) => this.request<any>('/admin/users', { method: 'POST', body: data }),

    updateUser: (
      id: string,
      data: { role?: string; clinicName?: string; phone?: string; isActive?: boolean; name?: string }
    ) => this.request<any>(`/admin/users/${id}`, { method: 'PUT', body: data }),

    clinics: () => this.request<{ clinics: { id: string; name: string; phone?: string | null; email?: string | null }[] }>('/admin/clinics'),

    /** Tenant subscription rows (`adminTenants` router); includes `planRef` when available. */
    subscriptionsList: () => this.request<{ success: boolean; data: unknown[] }>('/admin/subscriptions'),

    upgradePlan: (body: { clinicId: string; planName: 'PLATINUM' | 'PREMIUM' | 'LUXURY' | 'FREE' }) =>
      this.request<{ ok: boolean; clinicId: string; planName: string }>('/admin/upgrade-plan', { method: 'PUT', body }),

    disableClinic: (body: { clinicId: string; disabled: boolean }) =>
      this.request<{ ok: boolean; clinicId: string; isActive: boolean }>('/admin/disable-clinic', { method: 'POST', body }),
  };

  clinic = {
    branches: () => this.request<{ branches: Array<{ id: string; clinicId: string; name: string; address?: string | null }> }>('/clinic/branches'),
    createBranch: (body: { name: string; address?: string | null }) =>
      this.request<{ branch: { id: string; name: string; address?: string | null } }>('/clinic/branches', { method: 'POST', body }),
    updateBranch: (id: string, body: { name?: string; address?: string | null }) =>
      this.request<{ branch: { id: string; name: string; address?: string | null } }>(`/clinic/branches/${id}`, {
        method: 'PUT',
        body,
      }),
    deleteBranch: (id: string) => this.request<{ ok: boolean }>(`/clinic/branches/${id}`, { method: 'DELETE' }),
    subscription: () => this.request<{ clinic: unknown; subscription: unknown }>('/clinic/subscription'),
    activityLogs: (params?: { page?: number; limit?: number; userId?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.userId) q.set('userId', params.userId);
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return this.request<{ logs: unknown[]; total: number; page: number; limit: number }>(
        `/clinic/activity-logs?${q.toString()}`
      );
    },
  };

  superAdmin = {
    pendingSignups: () => this.request<{ pending: any[]; count: number }>('/super-admin/pending-signups'),

    approveSignup: (userId: string) =>
      this.request<any>(`/super-admin/users/${userId}/approve-signup`, { method: 'POST' }),

    rejectSignup: (userId: string) =>
      this.request<{ ok: boolean }>(`/super-admin/users/${userId}/reject-signup`, { method: 'POST' }),

    stats: () => this.request<any>('/super-admin/stats'),
    clinics: (params?: { search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search ?? '');
      if (params?.page) query.set('page', String(params.page ?? 1));
      if (params?.limit) query.set('limit', String(params.limit ?? 20));
      return this.request<{ clinics: any[]; total: number; page: number; limit: number }>(`/super-admin/clinics?${query}`);
    },
    revenueByBranch: (params?: { startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return this.request<{ branches: any[]; start: string; end: string }>(`/super-admin/revenue-by-branch?${query}`);
    },
    chairUtilization: (params?: { startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      return this.request<{ utilization: any[]; start: string; end: string }>(`/super-admin/chair-utilization?${query}`);
    },
    activityLogs: (params?: { userId?: string; action?: string; entity?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.userId) query.set('userId', params.userId);
      if (params?.action) query.set('action', params.action);
      if (params?.entity) query.set('entity', params.entity);
      if (params?.page) query.set('page', String(params?.page ?? 1));
      if (params?.limit) query.set('limit', String(params?.limit ?? 50));
      return this.request<{ logs: any[]; total: number; page: number; limit: number }>(`/super-admin/activity-logs?${query}`);
    },

    doctors: (params?: { search?: string; clinicId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.clinicId) query.set('clinicId', params.clinicId);
      if (params?.page) query.set('page', String(params?.page ?? 1));
      if (params?.limit) query.set('limit', String(params?.limit ?? 20));
      return this.request<{ doctors: any[]; total: number; page: number; limit: number }>(`/super-admin/doctors?${query}`);
    },

    updateDoctor: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        clinicName?: string;
        clinicAddress?: string;
        clinicPhone?: string;
        degree?: string;
        specialization?: string;
        isActive?: boolean;
        role?: 'DOCTOR' | 'CLINIC_ADMIN';
      }
    ) => this.request<any>(`/super-admin/doctors/${id}`, { method: 'PUT', body: data }),

    patients: (params?: { search?: string; doctorId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.doctorId) query.set('doctorId', params.doctorId);
      if (params?.page) query.set('page', String(params?.page ?? 1));
      if (params?.limit) query.set('limit', String(params?.limit ?? 20));
      return this.request<{ patients: any[]; total: number; page: number; limit: number }>(`/super-admin/patients?${query}`);
    },

    updatePatient: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        age?: number | string | null;
        gender?: string;
        email?: string;
        address?: string;
        bloodGroup?: string;
        occupation?: string;
        referredBy?: string;
        notes?: string;
      }
    ) => this.request<any>(`/super-admin/patients/${id}`, { method: 'PUT', body: data }),

    prescriptions: (params?: { doctorId?: string; patientId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.doctorId) query.set('doctorId', params.doctorId);
      if (params?.patientId) query.set('patientId', params.patientId);
      if (params?.page) query.set('page', String(params?.page ?? 1));
      if (params?.limit) query.set('limit', String(params?.limit ?? 20));
      return this.request<{ prescriptions: any[]; total: number; page: number; limit: number }>(
        `/super-admin/prescriptions?${query}`
      );
    },

    updatePrescription: (
      id: string,
      data: {
        diagnosis?: string;
        chiefComplaint?: string;
        examination?: string;
        investigation?: string;
        advice?: string;
        followUpDate?: string | null;
        vitals?: string;
        items?: Array<{
          drugName: string;
          genericName?: string;
          dosage: string;
          frequency: string;
          duration: string;
          beforeFood?: boolean;
          afterFood?: boolean;
          instructions?: string;
        }>;
      }
    ) => this.request<any>(`/super-admin/prescriptions/${id}`, { method: 'PUT', body: data }),
  };

  invite = {
    preview: (token: string) =>
      this.request<{ ok: boolean; clinicName: string; emailMasked: string; role: string }>(
        `/invite/preview?token=${encodeURIComponent(token)}`
      ),
    create: (body: {
      email: string;
      role: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN';
      branchId?: string | null;
      clinicId?: string;
      expiresInDays?: number;
    }) => this.request<{ success: boolean; invite: unknown; acceptUrl: string }>('/invite', { method: 'POST', body }),
    accept: (body: { token: string; name: string; password: string }) =>
      this.request<{ message: string; user: unknown }>('/invite/accept', { method: 'POST', body }),
  };

  subscription = {
    upgrade: (body: {
      planId?: string;
      planName?: string;
      clinicId?: string;
      durationDays?: number;
      autoRenew?: boolean;
      /** After Stripe succeeds, references the `SubscriptionPayment` row the webhook marked `SUCCESS`. */
      verifiedPaymentId?: string;
    }) => this.request<{ success: boolean; data: unknown }>('/subscription/upgrade', { method: 'POST', body }),
  };

  payment = {
    initiate: (body: {
      amount: number;
      method: 'STRIPE';
      planCode: string;
      clinicId?: string;
    }) =>
      this.request<{
        success: boolean;
        data: {
          payment: { id: string; clinicId: string; amount: number; method: string; status: string; planCode?: string | null; createdAt: string };
          stripeClientSecret?: string;
        };
      }>('/payment/initiate', { method: 'POST', body }),
  };

  activity = {
    timeline: (params?: { userId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.userId) q.set('userId', params.userId);
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit ?? 50));
      return this.request<{ success: boolean; data: { items: unknown[]; total: number; page: number; limit: number } }>(
        `/activity/timeline?${q}`
      );
    },
  };

  billing = {
    status: () => this.request<{ success: boolean; data: Record<string, unknown> }>('/billing/status'),
  };
}

export const api = new ApiClient();
export default api;
