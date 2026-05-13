import { API_BASE } from '@/config/api';
import { coreApiBillingSubscription } from '@/lib/core';
import type {
  ClinicActivityLogsResponse,
  ClinicProfile,
  ClinicSubscriptionPayload,
} from '@/types/clinicWorkspace';
import type {
  PatientPortalAppointmentRow,
  PatientPortalInvoiceRow,
  PatientPortalMedicalSection,
  PatientPortalPaymentLinkResult,
  PatientPortalProfile,
} from '@/types/patientPortal';
import type { OrganizationNode, NetworkStaffRole } from '@/types/network';
import {
  clearCoreApiSession,
  coreApiActivityTimeline,
  coreApiAdminAuditLogs,
  coreApiAdminClinics,
  coreApiAdminCreateUser,
  coreApiAdminDisableClinic,
  coreApiAdminMasterLogoGet,
  coreApiAdminMasterLogoUpdate,
  coreApiAdminPlatformOrders,
  coreApiAdminStats,
  coreApiAdminSubscriptionPaymentsList,
  coreApiAdminSubscriptionPaymentPatch,
  coreApiAdminSubscriptionsList,
  coreApiAdminRevokeUserSessions,
  coreApiAdminUpdateUser,
  coreApiAdminUpgradePlan,
  coreApiAdminUsers,
  coreApiAppointmentById,
  coreApiAppointmentCancel,
  coreApiAppointmentComplete,
  coreApiAppointmentConfirm,
  coreApiAppointmentCreate,
  coreApiAppointmentDelete,
  coreApiAppointmentUpdate,
  coreApiAppointmentsCalendar,
  coreApiAppointmentsList,
  coreApiAppointmentsToday,
  coreApiAppointmentsUpcoming,
  coreApiAuthChangePassword,
  coreApiAuthMe,
  coreApiAuthRegister,
  coreApiAuthRegisterSaas,
  coreApiAuthUpdateProfile,
  coreApiBillingCheckout,
  coreApiBillingStatus,
  coreApiBootstrapStorage,
  coreApiClinicActivityLogs,
  coreApiClinicBranches,
  coreApiClinicCreateBranch,
  coreApiClinicDeleteBranch,
  coreApiClinicProfileGet,
  coreApiClinicProfileUpdate,
  coreApiClinicSubscription,
  coreApiClinicUpdateBranch,
  type ClinicProfileUpdateInput,
  corePatientPortalAppointmentBook,
  corePatientPortalAppointmentCancel,
  corePatientPortalAppointmentsList,
  corePatientPortalInvoices,
  corePatientPortalLogout,
  corePatientPortalMedicalSummaryGet,
  corePatientPortalPaymentLink,
  corePatientPortalProfileGet,
  corePatientPortalProfileUpdate,
  corePatientPortalRefresh,
  corePatientPortalRequestOtp,
  corePatientPortalVerifyOtp,
  type PatientPortalBookInput,
  type PatientPortalProfileUpdate,
  coreApiCommunicationAppointmentReminder,
  coreApiCommunicationBulkReminders,
  coreApiCommunicationEmailLogs,
  coreApiCommunicationSendEmail,
  coreApiCommunicationSendSms,
  coreApiCommunicationSendWhatsApp,
  coreApiCommunicationSmsLogs,
  coreApiDashboardAppointmentChart,
  coreApiDashboardRecentPatients,
  coreApiDashboardRevenueChart,
  coreApiDashboardStats,
  coreApiDashboardToday,
  coreApiDashboardTreatmentStats,
  coreApiDiagnosticsTenantStatus,
  coreApiHealthPing,
  coreApiInviteAccept,
  coreApiInviteCreate,
  coreApiInvitePreview,
  coreApiSettingsGet,
  coreApiSettingsUpdate,
  coreApiInvoiceAddPayment,
  coreApiInvoiceById,
  coreApiInvoiceCreate,
  coreApiInvoiceDelete,
  coreApiInvoiceSendEmail,
  coreApiInvoiceSendWhatsApp,
  coreApiInvoiceUpdate,
  coreApiInvoicesList,
  coreApiInvoicesStats,
  coreApiLabCreate,
  coreApiLabDelete,
  coreApiLabList,
  coreApiLabMarkDelivered,
  coreApiLabMarkFitted,
  coreApiLabMarkReady,
  coreApiLabOrderById,
  coreApiLabPending,
  coreApiLabSendToLab,
  coreApiLabStats,
  coreApiLabUpdate,
  coreApiLogin,
  coreApiLogoutAllDevices,
  coreApiManualRefreshSession,
  coreApiPatientAddConsent,
  coreApiPatientCreate,
  coreApiPatientDelete,
  coreApiPatientGet,
  coreApiPatientTimeline,
  coreApiPatientUpdate,
  coreApiPatientUpdateDentalChart,
  coreApiPatientUpdateMedicalHistory,
  coreApiPatientsAddTreatmentPlan,
  coreApiPatientsAddTreatmentRecord,
  coreApiPatientsDeleteTreatmentPlan,
  coreApiPatientsDeleteTreatmentRecord,
  coreApiPatientsList,
  coreApiPatientsUpdateTreatmentRecord,
  coreApiPatientsUpdateTreatmentPlan,
  coreApiManualPaymentInitiate,
  coreApiPracticePatientWorkspaceHydration,
  coreApiPrescriptionById,
  coreApiPrescriptionCreate,
  coreApiPrescriptionDelete,
  coreApiPrescriptionSendEmail,
  coreApiPrescriptionSendWhatsApp,
  coreApiPrescriptionUpdate,
  coreApiPrescriptionsList,
  coreApiRemoteLogout,
  coreApiSerializeMedicalHistoryForUpdate,
  coreApiShopAdminCreateProduct,
  coreApiShopAdminDeleteProduct,
  coreApiShopAdminOrdersList,
  coreApiShopAdminProductsList,
  coreApiShopAdminStats,
  coreApiShopAdminUpdateOrderStatus,
  coreApiShopAdminUpdateProduct,
  coreApiShopCart,
  coreApiShopCartAdd,
  coreApiShopCartClear,
  coreApiShopCartRemove,
  coreApiShopCartUpdate,
  coreApiShopCheckout,
  coreApiShopOrder,
  coreApiShopOrdersByPhone,
  coreApiShopProductBySlug,
  coreApiShopProductCategories,
  coreApiShopProductsList,
  coreApiSubscriptionUpgrade,
  coreApiSuperAdminActivityLogs,
  coreApiSuperAdminCapabilitiesCatalog,
  coreApiSuperAdminApproveSignup,
  type ApproveSignupPayload,
  coreApiSuperAdminChairUtilization,
  coreApiSuperAdminClinics,
  coreApiSuperAdminGetClinicCapabilityOverrides,
  coreApiSuperAdminPutClinicCapabilityOverrides,
  coreApiSuperAdminDemoReset,
  coreApiSuperAdminDoctors,
  coreApiSuperAdminPatients,
  coreApiSuperAdminPendingSignups,
  coreApiSuperAdminPrescriptions,
  coreApiSuperAdminRejectSignup,
  coreApiSuperAdminRevenueByBranch,
  coreApiSuperAdminStats,
  coreApiSuperAdminUpdateDoctor,
  coreApiSuperAdminUpdatePatient,
  coreApiSuperAdminUpdatePrescription,
  coreApiSyncPrismaPassword,
  coreApiTenantOrderById,
  coreApiTenantOrderCreate,
  coreApiTenantOrderRemove,
  coreApiTenantOrdersList,
  coreApiTenantProductById,
  coreApiTenantProductCreate,
  coreApiTenantProductRemove,
  coreApiTenantUploadProductImage,
  coreApiTenantProductUpdate,
  coreApiTenantProductsList,
  coreApiUiHydrateDashboardHeaderDraft,
  coreApiUiHydrateDashboardPrintDraft,
  coreApiUiHydrateFullPrescriptionPrintSetup,
  coreApiUiHydratePrescriptionHeader,
  coreApiUiLoadBillingProcedureList,
  coreApiUiMergeDashboardHeaderClinicPatch,
  coreApiUiMergeDashboardHeaderDoctorPatch,
  coreApiUiPersistPrescriptionHeader,
  coreApiUiPersistPrescriptionPrintSetup,
  coreApiUiReadHeaderSettingsRecord,
  coreApiUiSaveDashboardPrintOverrides,
  activeBranchForClinic,
  assertTenantIsolation,
  branchScopedQueryKey,
  buildDeterministicPatientSummary,
  detectSchedulingGaps,
  evaluateNetworkPermission,
  findPossiblyUnbilledMarkers,
  MOCK_ORG_ROLES,
  resolveOrganizationTree,
  suggestInvoiceLinesFromTreatmentNotes,
  suggestSlotEfficiency,
  suggestTriageFromSymptoms,
  unifyPatientAcrossBranches,
  type BillingLineSuggestion,
  type PatientNarrativeBlock,
  type SchedulingAssistantInput,
  type SlotInsight,
  type TriageSuggestion,
  type ClinicSettings,
  coreApiGetUserSnapshotJson,
  coreApiSetUserSnapshotJson,
  getAccessToken,
  optimisticAppointmentFromForm,
  optimisticPatientFromForm,
  optimisticPrescriptionFromForm,
  setCoreApiRefreshFailedLogoutHandler,
} from '@/lib/apiClient';

class ApiClient {
  health = {
    ping: (signal?: AbortSignal) => coreApiHealthPing(signal),
  };

  diagnostics = {
    tenantStatus: () => coreApiDiagnosticsTenantStatus(),
  };

  tenantProducts = {
    list: () => coreApiTenantProductsList(),
    get: (id: string) => coreApiTenantProductById(id),
    uploadImage: (file: File, assetType?: 'general' | 'clinicLogo' | 'doctorLogo') =>
      coreApiTenantUploadProductImage(file, assetType),
    create: (name: string, price: number, costPrice?: number, imageUrl?: string | null) =>
      coreApiTenantProductCreate(name, price, costPrice ?? 0, imageUrl),
    update: (id: string, name: string, price: number, costPrice?: number) =>
      coreApiTenantProductUpdate(id, name, price, costPrice),
    remove: (id: string) => coreApiTenantProductRemove(id),
  };

  tenantOrders = {
    list: () => coreApiTenantOrdersList(),
    get: (id: string) => coreApiTenantOrderById(id),
    create: (productId: string, quantity: number) => coreApiTenantOrderCreate(productId, quantity),
    remove: (id: string) => coreApiTenantOrderRemove(id),
  };

  auth = {
    login: coreApiLogin,

    register: coreApiAuthRegister,

    /** Instant SaaS tenant (approved + JWT). */
    registerSaas: coreApiAuthRegisterSaas,

    me: coreApiAuthMe,

    /** Rotate refresh token; call after access JWT expires. Does not retry on 401. */
    refreshSession: coreApiManualRefreshSession,

    /** Revoke all refresh tokens and invalidate access JWTs (requires valid access token). */
    logoutAllDevices: coreApiLogoutAllDevices,

    updateProfile: (data: Record<string, unknown>) => coreApiAuthUpdateProfile(data),

    changePassword: (currentPassword: string, newPassword: string) =>
      coreApiAuthChangePassword(currentPassword, newPassword),

    logout: coreApiRemoteLogout,

    /** Keeps Prisma password hash aligned after Supabase password recovery. */
    syncPrismaPassword: coreApiSyncPrismaPassword,
  };

  /**
   * Browser session + user snapshot — implemented in core client; UI must use only via this facade.
   */
  session = {
    bootstrapStorage: coreApiBootstrapStorage,
    clear: clearCoreApiSession,
    getAccessToken,
    getUserSnapshotJson: coreApiGetUserSnapshotJson,
    setUserSnapshotJson: coreApiSetUserSnapshotJson,
    setRefreshFailedHandler: setCoreApiRefreshFailedLogoutHandler,
  };

  /**
   * Optimistic domain rows for demo/offline UX — implemented in `coreOptimisticFactory`; UI must only call these,
   * never import the factory or `Practice*` construction paths from `@/lib/core`.
   */
  optimistic = {
    patientFromForm: optimisticPatientFromForm,
    appointmentFromForm: optimisticAppointmentFromForm,
    prescriptionFromForm: optimisticPrescriptionFromForm,
  };

  patients = {
    list: (params?: { search?: string; page?: number; limit?: number }) =>
      coreApiPatientsList({
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }),

    get: (id: string) => coreApiPatientGet(id),

    /** Unified timeline (appointments, treatments, invoices, Rx, lab) — `GET /patients/:id/timeline`. */
    timeline: (id: string) => coreApiPatientTimeline(id),

    /** Normalized patient sub-documents for practice workspace (from `GET /patients/:id`). */
    workspaceHydration: (id: string) => coreApiPracticePatientWorkspaceHydration(id),

    create: (data: Record<string, unknown>) => coreApiPatientCreate(data),

    update: (id: string, data: Record<string, unknown>) => coreApiPatientUpdate(id, data),

    delete: (id: string) => coreApiPatientDelete(id),

    updateMedicalHistory: (id: string, data: Record<string, unknown>) =>
      coreApiPatientUpdateMedicalHistory(id, data),

    updateDentalChart: (id: string, data: Record<string, unknown>) =>
      coreApiPatientUpdateDentalChart(id, data),

    addTreatmentPlan: (id: string, data: Parameters<typeof coreApiPatientsAddTreatmentPlan>[1]) =>
      coreApiPatientsAddTreatmentPlan(id, data),

    updateTreatmentPlan: (id: string, planId: string, data: Parameters<typeof coreApiPatientsUpdateTreatmentPlan>[2]) =>
      coreApiPatientsUpdateTreatmentPlan(id, planId, data),

    deleteTreatmentPlan: (id: string, planId: string) => coreApiPatientsDeleteTreatmentPlan(id, planId),

    addTreatmentRecord: (id: string, data: Parameters<typeof coreApiPatientsAddTreatmentRecord>[1]) =>
      coreApiPatientsAddTreatmentRecord(id, data),

    updateTreatmentRecord: (
      id: string,
      recordId: string,
      data: Parameters<typeof coreApiPatientsUpdateTreatmentRecord>[2]
    ) => coreApiPatientsUpdateTreatmentRecord(id, recordId, data),

    deleteTreatmentRecord: (id: string, recordId: string) => coreApiPatientsDeleteTreatmentRecord(id, recordId),

    addConsent: (id: string, data: Record<string, unknown>) => coreApiPatientAddConsent(id, data),

    serializeMedicalHistoryForUpdate: (
      data: Parameters<typeof coreApiSerializeMedicalHistoryForUpdate>[0]
    ) => coreApiSerializeMedicalHistoryForUpdate(data),
  };

  appointments = {
    list: (params?: { date?: string; startDate?: string; endDate?: string; status?: string }) =>
      coreApiAppointmentsList(params),

    today: () => coreApiAppointmentsToday(),

    upcoming: (limit?: number) => coreApiAppointmentsUpcoming(limit ?? 10),

    calendar: (month: number, year: number) => coreApiAppointmentsCalendar(month, year),

    get: (id: string) => coreApiAppointmentById(id),

    create: (data: Record<string, unknown>) => coreApiAppointmentCreate(data as Parameters<typeof coreApiAppointmentCreate>[0]),

    update: (id: string, data: Record<string, unknown>) => coreApiAppointmentUpdate(id, data),

    delete: (id: string) => coreApiAppointmentDelete(id),

    cancel: (id: string) => coreApiAppointmentCancel(id),

    complete: (id: string) => coreApiAppointmentComplete(id),

    confirm: (id: string) => coreApiAppointmentConfirm(id),
  };

  prescriptions = {
    list: (params?: { patientId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
      coreApiPrescriptionsList({
        patientId: params?.patientId,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        limit: params?.limit,
      }),

    get: (id: string) => coreApiPrescriptionById(id),

    create: (data: Record<string, unknown>) => coreApiPrescriptionCreate(data),

    update: (id: string, data: Record<string, unknown>) => coreApiPrescriptionUpdate(id, data),

    delete: (id: string) => coreApiPrescriptionDelete(id),

    getPDF: (id: string) => `${API_BASE}/prescriptions/${id}/pdf`,

    sendEmail: (id: string) => coreApiPrescriptionSendEmail(id),

    sendWhatsApp: (id: string) => coreApiPrescriptionSendWhatsApp(id),
  };

  invoices = {
    list: (params?: {
      patientId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) =>
      coreApiInvoicesList({
        patientId: params?.patientId,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        limit: params?.limit,
      }),

    stats: () => coreApiInvoicesStats(),

    get: (id: string) => coreApiInvoiceById(id),

    create: (data: Record<string, unknown>) => coreApiInvoiceCreate(data),

    update: (id: string, data: Record<string, unknown>) => coreApiInvoiceUpdate(id, data),

    delete: (id: string) => coreApiInvoiceDelete(id),

    addPayment: (id: string, data: Record<string, unknown>) => coreApiInvoiceAddPayment(id, data),

    getPDF: (id: string) => `${API_BASE}/invoices/${id}/pdf`,

    sendEmail: (id: string) => coreApiInvoiceSendEmail(id),

    sendWhatsApp: (id: string) => coreApiInvoiceSendWhatsApp(id),
  };

  lab = {
    list: (params?: { patientId?: string; status?: string; workType?: string; page?: number; limit?: number }) =>
      coreApiLabList({
        patientId: params?.patientId,
        status: params?.status,
        workType: params?.workType,
        page: params?.page,
        limit: params?.limit,
      }),

    pending: () => coreApiLabPending(),

    stats: () => coreApiLabStats(),

    get: (id: string) => coreApiLabOrderById(id),

    create: (data: Record<string, unknown>) => coreApiLabCreate(data),

    update: (id: string, data: Record<string, unknown>) => coreApiLabUpdate(id, data),

    delete: (id: string) => coreApiLabDelete(id),

    sendToLab: (id: string) => coreApiLabSendToLab(id),

    markReady: (id: string) => coreApiLabMarkReady(id),

    markDelivered: (id: string) => coreApiLabMarkDelivered(id),

    markFitted: (id: string) => coreApiLabMarkFitted(id),
  };

  shop = {
    products: (params?: { category?: string; search?: string; featured?: boolean; page?: number }) =>
      coreApiShopProductsList(params),

    categories: () => coreApiShopProductCategories(),

    product: (slug: string) => coreApiShopProductBySlug(slug),

    cart: () => coreApiShopCart(),

    addToCart: (productId: string, quantity?: number) => coreApiShopCartAdd(productId, quantity),

    updateCart: (productId: string, quantity: number) => coreApiShopCartUpdate(productId, quantity),

    removeFromCart: (productId: string) => coreApiShopCartRemove(productId),

    clearCart: () => coreApiShopCartClear(),

    checkout: (data: Record<string, unknown>) => coreApiShopCheckout(data),

    order: (orderNo: string) => coreApiShopOrder(orderNo),

    ordersByPhone: (phone: string) => coreApiShopOrdersByPhone(phone),
  };

  shopAdmin = {
    stats: () => coreApiShopAdminStats(),

    products: (params?: { category?: string; search?: string; page?: number; limit?: number }) =>
      coreApiShopAdminProductsList(params),

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
    }) => coreApiShopAdminCreateProduct(data as Record<string, unknown>),

    updateProduct: (id: string, data: Record<string, unknown>) => coreApiShopAdminUpdateProduct(id, data),

    deleteProduct: (id: string) => coreApiShopAdminDeleteProduct(id),

    orders: (params?: { status?: string; page?: number; limit?: number }) => coreApiShopAdminOrdersList(params),

    updateOrderStatus: (id: string, status: string, trackingNumber?: string) =>
      coreApiShopAdminUpdateOrderStatus(id, status, trackingNumber),
  };

  communication = {
    sendSMS: (phone: string, message: string, type?: string) =>
      coreApiCommunicationSendSms(phone, message, type),

    sendAppointmentReminder: (appointmentId: string) =>
      coreApiCommunicationAppointmentReminder(appointmentId),

    sendBulkReminders: () => coreApiCommunicationBulkReminders(),

    smsLogs: (page?: number) => coreApiCommunicationSmsLogs(page ?? 1),

    sendEmail: (to: string, subject: string, body: string, type?: string) =>
      coreApiCommunicationSendEmail(to, subject, body, type),

    emailLogs: (page?: number) => coreApiCommunicationEmailLogs(page ?? 1),

    sendWhatsApp: (phone: string, message: string) => coreApiCommunicationSendWhatsApp(phone, message),
  };

  dashboard = {
    stats: () => coreApiDashboardStats(),

    today: () => coreApiDashboardToday(),

    recentPatients: () => coreApiDashboardRecentPatients(),

    revenueChart: (period?: 'daily' | 'monthly') => coreApiDashboardRevenueChart(period ?? 'monthly'),

    appointmentChart: () => coreApiDashboardAppointmentChart(),

    treatmentStats: () => coreApiDashboardTreatmentStats(),
  };

  admin = {
    users: (params?: {
      search?: string;
      role?: string;
      page?: number;
      limit?: number;
      clinicId?: string;
      sort?: string;
    }) => coreApiAdminUsers(params),

    createUser: (data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role?: 'DOCTOR' | 'CLINIC_ADMIN';
      clinicId?: string;
    }) => coreApiAdminCreateUser(data as Record<string, unknown>),

    updateUser: (
      id: string,
      data: {
        role?: string;
        clinicName?: string;
        phone?: string;
        isActive?: boolean;
        name?: string;
        clinicId?: string;
        password?: string;
        accountStatus?: string;
        isApproved?: boolean;
      }
    ) => coreApiAdminUpdateUser(id, data as Record<string, unknown>),

    revokeUserSessions: (id: string) => coreApiAdminRevokeUserSessions(id),

    clinics: () => coreApiAdminClinics(),

    stats: () => coreApiAdminStats(),

    platformOrders: (params?: { page?: number; limit?: number }) => coreApiAdminPlatformOrders(params),

    auditLogs: (params?: { page?: number; limit?: number }) => coreApiAdminAuditLogs(params),

    /** Tenant subscription rows (`adminTenants` router); includes `planRef` when available. */
    subscriptionsList: () => coreApiAdminSubscriptionsList(),

    upgradePlan: (body: { clinicId: string; planName: 'PLATINUM' | 'PREMIUM' | 'LUXURY' | 'FREE' }) =>
      coreApiAdminUpgradePlan(body),

    disableClinic: (body: { clinicId: string; disabled: boolean }) => coreApiAdminDisableClinic(body),
    masterLogo: () => coreApiAdminMasterLogoGet(),
    updateMasterLogo: (logo: string) => coreApiAdminMasterLogoUpdate(logo),

    subscriptionPayments: (params?: { limit?: number }) => coreApiAdminSubscriptionPaymentsList(params),

    subscriptionPaymentPatch: (id: string, body: { status: 'CONTACTED' | 'PAID' | 'REJECTED' }) =>
      coreApiAdminSubscriptionPaymentPatch(id, body),
  };

  clinic = {
    branches: () => coreApiClinicBranches(),
    createBranch: (body: { name: string; address?: string | null }) => coreApiClinicCreateBranch(body),
    updateBranch: (id: string, body: { name?: string; address?: string | null }) => coreApiClinicUpdateBranch(id, body),
    deleteBranch: (id: string) => coreApiClinicDeleteBranch(id),
    subscription: (): Promise<ClinicSubscriptionPayload> => coreApiClinicSubscription(),
    activityLogs: (params?: {
      page?: number;
      limit?: number;
      userId?: string;
      from?: string;
      to?: string;
    }): Promise<ClinicActivityLogsResponse> => coreApiClinicActivityLogs(params),

    getProfile: (): Promise<{ profile: ClinicProfile }> => coreApiClinicProfileGet(),

    updateProfile: (body: ClinicProfileUpdateInput): Promise<{ profile: ClinicProfile }> =>
      coreApiClinicProfileUpdate(body),
  };

  settings = {
    get: (): Promise<ClinicSettings> => coreApiSettingsGet(),
    update: (body: Partial<Omit<ClinicSettings, 'clinicId'>> & { ifMatchVersion?: string }): Promise<ClinicSettings> =>
      coreApiSettingsUpdate(body),
  };

  patientPortal = {
    requestOtp: (body: { phone: string; clinicId: string }) => corePatientPortalRequestOtp(body),

    verifyOtp: (body: { phone: string; clinicId: string; code: string }) => corePatientPortalVerifyOtp(body),

    refresh: () => corePatientPortalRefresh(),

    logout: () => corePatientPortalLogout(),

    getProfile: (): Promise<{ profile: PatientPortalProfile }> => corePatientPortalProfileGet(),

    updateProfile: (body: PatientPortalProfileUpdate): Promise<{ profile: PatientPortalProfile }> =>
      corePatientPortalProfileUpdate(body),

    getMedicalSummary: (patientId: string): Promise<{ sections: PatientPortalMedicalSection[] }> =>
      corePatientPortalMedicalSummaryGet(patientId),

    listAppointments: (): Promise<{ appointments: PatientPortalAppointmentRow[] }> =>
      corePatientPortalAppointmentsList(),

    bookAppointment: (body: PatientPortalBookInput) => corePatientPortalAppointmentBook(body),

    cancelAppointment: (id: string) => corePatientPortalAppointmentCancel(id),

    listInvoices: (): Promise<{ invoices: PatientPortalInvoiceRow[] }> => corePatientPortalInvoices(),

    paymentLink: (invoiceId: string): Promise<PatientPortalPaymentLinkResult> =>
      corePatientPortalPaymentLink(invoiceId),
  };

  /** Deterministic AI helpers — suggestions only; no HTTP. */
  ai = {
    triageSymptoms: (symptoms: string): TriageSuggestion => suggestTriageFromSymptoms(symptoms),

    schedulingSlot: (input: SchedulingAssistantInput): SlotInsight => suggestSlotEfficiency(input),

    schedulingGaps: (busyMinuteMarks: number[]) => detectSchedulingGaps(busyMinuteMarks),

    billingLines: (treatmentNotes: string): BillingLineSuggestion[] =>
      suggestInvoiceLinesFromTreatmentNotes(treatmentNotes),

    billingUnbilledMarkers: (treatments: string[], invoiceLabels: string[]) =>
      findPossiblyUnbilledMarkers(treatments, invoiceLabels),

    patientSummaryBlocks: (
      parts: Parameters<typeof buildDeterministicPatientSummary>[0]
    ): PatientNarrativeBlock[] => buildDeterministicPatientSummary(parts),
  };

  /** Hospital network graph (stub engines; server contracts TBD). */
  network = {
    organizationTree: (seed: OrganizationNode[]) => resolveOrganizationTree(seed),

    tenantIsolationOk: (currentOrgId: string, resourceOrgId: string) =>
      assertTenantIsolation(currentOrgId, resourceOrgId),

    branchForClinic: (clinicId: string) => activeBranchForClinic(clinicId),

    branchQueryKey: (clinicId: string, suffix: string) => branchScopedQueryKey(clinicId, suffix),

    unifyPatients: (patientIds: string[]) => unifyPatientAcrossBranches(patientIds),

    permission: (viewer: NetworkStaffRole[], scope: NetworkStaffRole['scope']) =>
      evaluateNetworkPermission(viewer, scope),

    mockRoles: MOCK_ORG_ROLES,
  };

  superAdmin = {
    pendingSignups: () => coreApiSuperAdminPendingSignups(),

    approveSignup: (userId: string, body?: ApproveSignupPayload) => coreApiSuperAdminApproveSignup(userId, body ?? {}),

    rejectSignup: (userId: string) => coreApiSuperAdminRejectSignup(userId),

    demoReset: () => coreApiSuperAdminDemoReset(),

    capabilitiesCatalog: () => coreApiSuperAdminCapabilitiesCatalog(),
    clinicCapabilityOverrides: (clinicId: string) => coreApiSuperAdminGetClinicCapabilityOverrides(clinicId),
    putClinicCapabilityOverrides: (
      clinicId: string,
      overrides: { capabilityKey: string; grant: boolean }[]
    ) => coreApiSuperAdminPutClinicCapabilityOverrides(clinicId, overrides),

    stats: () => coreApiSuperAdminStats(),
    clinics: (params?: { search?: string; page?: number; limit?: number }) => coreApiSuperAdminClinics(params),
    revenueByBranch: (params?: { startDate?: string; endDate?: string }) =>
      coreApiSuperAdminRevenueByBranch(params),
    chairUtilization: (params?: { startDate?: string; endDate?: string }) =>
      coreApiSuperAdminChairUtilization(params),
    activityLogs: (params?: { userId?: string; action?: string; entity?: string; page?: number; limit?: number }) =>
      coreApiSuperAdminActivityLogs(params),

    doctors: (params?: { search?: string; clinicId?: string; page?: number; limit?: number }) =>
      coreApiSuperAdminDoctors(params),

    updateDoctor: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        clinicName?: string;
        clinicAddress?: string;
        clinicPhone?: string;
        title?: string | null;
        degree?: string | null;
        specialization?: string | null;
        isActive?: boolean;
        professionalVerified?: boolean;
        role?: 'DOCTOR' | 'CLINIC_ADMIN' | 'CLINIC_OWNER' | 'RECEPTIONIST' | 'LAB_TECH' | 'DENTAL_ASSISTANT';
      }
    ) => coreApiSuperAdminUpdateDoctor(id, data as Record<string, unknown>),

    patients: (params?: { search?: string; doctorId?: string; page?: number; limit?: number }) =>
      coreApiSuperAdminPatients(params),

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
    ) => coreApiSuperAdminUpdatePatient(id, data as Record<string, unknown>),

    prescriptions: (params?: { doctorId?: string; patientId?: string; page?: number; limit?: number }) =>
      coreApiSuperAdminPrescriptions(params),

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
    ) => coreApiSuperAdminUpdatePrescription(id, data as Record<string, unknown>),
  };

  invite = {
    preview: (token: string) => coreApiInvitePreview(token),
    create: (body: {
      email: string;
      role: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN' | 'STORE_MANAGER';
      branchId?: string | null;
      clinicId?: string;
      expiresInDays?: number;
    }) => coreApiInviteCreate(body as Record<string, unknown>),
    accept: (body: { token: string; name: string; password: string }) =>
      coreApiInviteAccept(body as Record<string, unknown>),
  };

  subscription = {
    upgrade: (body: {
      planId?: string;
      planName?: string;
      clinicId?: string;
      durationDays?: number;
      autoRenew?: boolean;
      /** After super-admin marks a manual WhatsApp payment `PAID`, optional reference. */
      verifiedPaymentId?: string;
    }) => coreApiSubscriptionUpgrade(body as Record<string, unknown>),
  };

  payment = {
    manualInitiate: (body: { planCode: string; clinicId?: string; amountMinor?: number }) =>
      coreApiManualPaymentInitiate(body),
  };

  activity = {
    timeline: (params?: { userId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
      coreApiActivityTimeline(params),
  };

  billing = {
    status: () => coreApiBillingStatus(),
    subscription: () => coreApiBillingSubscription(),
    checkout: (body: { planCode?: string }) => coreApiBillingCheckout(body),
  };

  /** Browser UI persistence for prescriptions/dashboard printing — delegated to core client. */
  ui = {
    hydrateDashboardHeaderDraft: coreApiUiHydrateDashboardHeaderDraft,
    hydrateDashboardPrintDraft: coreApiUiHydrateDashboardPrintDraft,
    readHeaderSettingsRecord: coreApiUiReadHeaderSettingsRecord,
    mergeDashboardHeaderClinic: coreApiUiMergeDashboardHeaderClinicPatch,
    mergeDashboardHeaderDoctor: coreApiUiMergeDashboardHeaderDoctorPatch,
    saveDashboardPrintOverrides: coreApiUiSaveDashboardPrintOverrides,
    loadBillingProcedureList: coreApiUiLoadBillingProcedureList,
    hydratePrescriptionHeader: coreApiUiHydratePrescriptionHeader,
    hydratePrescriptionPrintSetup: coreApiUiHydrateFullPrescriptionPrintSetup,
    persistPrescriptionHeader: coreApiUiPersistPrescriptionHeader,
    persistPrescriptionPrintSetup: coreApiUiPersistPrescriptionPrintSetup,
  };
}

export const api = new ApiClient();
export default api;
