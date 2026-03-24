/**
 * API base path or absolute URL (must end with `/api` for this client).
 * - Dev: defaults to `/api` (Vite proxy → backend).
 * - Prod same-origin (Express serves `dist` + `/api`): leave unset → `/api`.
 * - Prod split (e.g. app on Hostinger, API elsewhere): set VITE_API_URL=https://api.example.com/api
 */
function apiUrlBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const base = raw?.trim() ? raw.trim() : '/api';
  return base.replace(/\/$/, '');
}
const API_URL = apiUrlBase();

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;
  private sessionId: string;

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

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-session-id': this.sessionId,
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const status = response.status;
      const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
      const message = errorBody?.error || 'Request failed';

      // If the token is invalid/expired, clear auth state but don't hard-redirect.
      if (status === 401 && this.token) {
        const errorText = String(message).toLowerCase();
        if (
          errorText.includes('invalid token') ||
          errorText.includes('no token provided') ||
          errorText.includes('user not found') ||
          errorText.includes('unauthorized')
        ) {
          this.setToken(null);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.removeItem('baigdentpro:user');
            } catch {
              // ignore storage errors
            }
          }
        }
      }

      throw new Error(message);
    }

    return response.json();
  }

  auth = {
    login: async (email: string, password: string) => {
      const result = await this.request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      this.setToken(result.token);
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

    me: () => this.request<any>('/auth/me'),

    updateProfile: (data: any) => this.request<any>('/auth/profile', { method: 'PUT', body: data }),

    changePassword: (currentPassword: string, newPassword: string) =>
      this.request<any>('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),

    logout: () => {
      this.setToken(null);
      localStorage.removeItem('baigdentpro:user');
    },
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

    getPDF: (id: string) => `${API_URL}/prescriptions/${id}/pdf`,

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

    getPDF: (id: string) => `${API_URL}/invoices/${id}/pdf`,

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
    }>('/shop/admin/stats'),

    products: (params?: { category?: string; search?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
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

    orders: (params?: { status?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', String(params.page));
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
}

export const api = new ApiClient();
export default api;
