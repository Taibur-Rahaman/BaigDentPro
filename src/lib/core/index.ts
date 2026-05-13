export {
  ACCESS_TOKEN_KEY,
  clearCoreApiSession,
  coreApiBootstrapStorage,
  coreApiGetUserSnapshotJson,
  coreApiRemoveUserSnapshot,
  coreApiSetUserSnapshotJson,
  getAccessToken,
  getRefreshToken,
  persistAuthTokensFromResponse,
  setAccessToken,
  setRefreshToken,
} from '@/lib/core/coreAuthStorage';

export {
  type CoreApiMethod,
  type CoreApiOptions,
  coreApiRequest,
  setCoreApiRefreshFailedLogoutHandler,
} from '@/lib/core/coreHttpClient';

export {
  buildAppUserFromAuthPayload,
  type AuthProfileResponse,
  coreApiAuthChangePassword,
  coreApiAuthMe,
  coreApiAuthRegister,
  coreApiAuthRegisterSaas,
  coreApiAuthUpdateProfile,
  coreApiLogin,
  coreApiLogoutAllDevices,
  coreApiManualRefreshSession,
  coreApiRemoteLogout,
  coreApiSyncPrismaPassword,
} from '@/lib/core/coreAuthApi';

export { coreApiDiagnosticsTenantStatus, coreApiHealthPing } from '@/lib/core/coreDiagnosticsApi';

export {
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
} from '@/lib/core/corePatientFinanceApi';

export {
  coreApiManualPaymentInitiate,
  type CoreApiManualPaymentInitiateResult,
} from '@/lib/core/corePlatformSaasApi';

export {
  coreApiPatientAddConsent,
  coreApiPatientCreate,
  coreApiPatientDelete,
  coreApiPatientGet,
  coreApiPatientTimeline,
  type PatientTimelineEventPayload,
  coreApiPatientUpdate,
  coreApiPatientUpdateDentalChart,
  coreApiPatientUpdateMedicalHistory,
  coreApiPracticePatientWorkspaceHydration,
  coreApiPatientsAddTreatmentPlan,
  coreApiPatientsAddTreatmentRecord,
  coreApiPatientsDeleteTreatmentPlan,
  coreApiPatientsDeleteTreatmentRecord,
  coreApiPatientsList,
  coreApiPatientsUpdateTreatmentRecord,
  coreApiPatientsUpdateTreatmentPlan,
  coreApiSerializeMedicalHistoryForUpdate,
  parsePatientSummaryRow,
  type CoreApiDeletedTreatmentRecordResult,
  type CoreApiTreatmentPlanWriteInput,
  type CoreApiTreatmentRecordPatchInput,
  type CoreApiTreatmentRecordWriteInput,
  type DentalChartRowPayload,
} from '@/lib/core/corePatientsApi';

export {
  coreApiPrescriptionById,
  coreApiPrescriptionCreate,
  coreApiPrescriptionDelete,
  coreApiPrescriptionSendEmail,
  coreApiPrescriptionSendWhatsApp,
  coreApiPrescriptionUpdate,
  coreApiPrescriptionsList,
} from '@/lib/core/corePrescriptionsApi';

export {
  coreApiAdminMasterLogoGet,
  coreApiAdminMasterLogoUpdate,
  coreApiAdminAuditLogs,
  coreApiAdminClinics,
  coreApiAdminPlatformOrders,
  coreApiAdminStats,
  coreApiAdminUsers,
  coreApiAdminSubscriptionPaymentsList,
  coreApiAdminSubscriptionPaymentPatch,
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
} from '@/lib/core/coreAdminApi';

export {
  coreApiClinicActivityLogs,
  coreApiClinicSubscription,
} from '@/lib/core/coreDashboardClinicApi';

export {
  coreApiDashboardAppointmentChart,
  coreApiDashboardRecentPatients,
  coreApiDashboardRevenueChart,
  coreApiDashboardStats,
  coreApiDashboardToday,
  coreApiDashboardTreatmentStats,
} from '@/lib/core/coreDashboardApi';

export {
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
  parseAppointmentListItem,
} from '@/lib/core/coreAppointmentsApi';

export {
  coreApiShopAdminCreateProduct,
  coreApiShopAdminDeleteProduct,
  coreApiShopAdminOrdersList,
  coreApiShopAdminProductsList,
  coreApiShopAdminStats,
  coreApiShopAdminUpdateOrderStatus,
  coreApiShopAdminUpdateProduct,
  coreApiShopProductCategories,
} from '@/lib/core/coreShopApi';

export {
  coreApiShopCart,
  coreApiShopCartAdd,
  coreApiShopCartClear,
  coreApiShopCartRemove,
  coreApiShopCartUpdate,
  coreApiShopCheckout,
  coreApiShopOrder,
  coreApiShopOrdersByPhone,
  coreApiShopProductBySlug,
  coreApiShopProductsList,
} from '@/lib/core/coreShopPublicApi';

export {
  coreApiCommunicationAppointmentReminder,
  coreApiCommunicationBulkReminders,
  coreApiCommunicationEmailLogs,
  coreApiCommunicationSendEmail,
  coreApiCommunicationSendSms,
  coreApiCommunicationSendWhatsApp,
  coreApiCommunicationSmsLogs,
} from '@/lib/core/coreCommunicationApi';

export {
  coreApiAdminCreateUser,
  coreApiAdminRevokeUserSessions,
  coreApiAdminUpdateUser,
} from '@/lib/core/coreAdminUsersApi';

export {
  coreApiClinicBranches,
  coreApiClinicCreateBranch,
  coreApiClinicDeleteBranch,
  coreApiClinicUpdateBranch,
} from '@/lib/core/coreClinicBranchesApi';

export {
  coreApiClinicProfileGet,
  coreApiClinicProfileUpdate,
  type ClinicProfileUpdateInput,
} from '@/lib/core/coreClinicProfileApi';

export {
  type ApproveSignupPayload,
  coreApiSuperAdminActivityLogs,
  coreApiSuperAdminCapabilitiesCatalog,
  coreApiSuperAdminApproveSignup,
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
} from '@/lib/core/coreSuperAdminApi';

export {
  optimisticAppointmentFromForm,
  optimisticPatientFromForm,
  optimisticPrescriptionFromForm,
} from '@/lib/core/coreOptimisticFactory';

export {
  coreApiActivityTimeline,
  coreApiAdminDisableClinic,
  coreApiAdminSubscriptionsList,
  coreApiAdminUpgradePlan,
  coreApiBillingCheckout,
  coreApiBillingStatus,
  coreApiBillingSubscription,
  coreApiInviteAccept,
  coreApiInviteCreate,
  coreApiInvitePreview,
  coreApiSettingsGet,
  coreApiSettingsUpdate,
  coreApiSubscriptionUpgrade,
  type ClinicSettings,
} from '@/lib/core/coreMiscApi';

export {
  coreApiUiApplyDashboardPrintOverridesToPrintSetup,
  coreApiUiHydrateDashboardHeaderDraft,
  coreApiUiHydrateDashboardPrintDraft,
  coreApiUiHydrateFullPrescriptionPrintSetup,
  coreApiUiHydratePrescriptionHeader,
  coreApiUiLoadBillingProcedureList,
  coreApiUiMergeDashboardHeaderClinicPatch,
  coreApiUiMergeDashboardHeaderDoctorPatch,
  coreApiUiMergePrescriptionPrintSetup,
  coreApiUiPersistPrescriptionHeader,
  coreApiUiPersistPrescriptionPrintSetup,
  coreApiUiReadHeaderSettingsRecord,
  coreApiUiSaveDashboardPrintOverrides,
} from '@/lib/core/coreUiPrefsApi';

export {
  corePatientPortalAppointmentBook,
  corePatientPortalAppointmentCancel,
  corePatientPortalAppointmentsList,
  type PatientPortalBookInput,
} from '@/lib/core/corePatientPortalAppointments';

export { corePatientPortalInvoices, corePatientPortalPaymentLink } from '@/lib/core/corePatientPortalBilling';

export {
  corePatientPortalLogout,
  corePatientPortalRefresh,
  corePatientPortalRequestOtp,
  corePatientPortalVerifyOtp,
} from '@/lib/core/corePatientPortalAuth';

export {
  cachePatientMedicalSummary,
  corePatientPortalMedicalSummaryGet,
  corePatientPortalProfileGet,
  corePatientPortalProfileUpdate,
  readCachedPatientMedicalSummary,
  type PatientPortalProfileUpdate,
} from '@/lib/core/corePatientPortalProfile';

export { patientPortalApiRequest, type PatientPortalApiOptions } from '@/lib/core/corePatientPortalHttp';
export {
  clearPatientPortalSession,
  getPatientPortalAccessToken,
  getPatientPortalRefreshToken,
  setPatientPortalAccessToken,
  setPatientPortalRefreshToken,
} from '@/lib/core/corePatientPortalAuthStorage';

export { defaultAIProviderContext, type AIEngineKind, type AIProviderContext } from '@/lib/core/ai/coreAIProvider';
export { suggestTriageFromSymptoms, type TriageSuggestion, type TriageUrgency } from '@/lib/core/ai/coreAITriageEngine';
export {
  detectSchedulingGaps,
  suggestSlotEfficiency,
  type SchedulingAssistantInput,
  type SlotInsight,
} from '@/lib/core/ai/coreAISchedulingAssistant';
export {
  findPossiblyUnbilledMarkers,
  suggestInvoiceLinesFromTreatmentNotes,
  type BillingLineSuggestion,
} from '@/lib/core/ai/coreAIBillingAssistant';
export { buildDeterministicPatientSummary, type PatientNarrativeBlock } from '@/lib/core/ai/coreAIPatientSummary';

export { assertTenantIsolation, resolveOrganizationTree } from '@/lib/core/network/coreOrganizationEngine';
export { activeBranchForClinic, branchScopedQueryKey } from '@/lib/core/network/coreBranchEngine';
export { unifyPatientAcrossBranches } from '@/lib/core/network/coreNetworkPatientGraph';
export { evaluateNetworkPermission, MOCK_ORG_ROLES } from '@/lib/core/network/coreRBACNetworkEngine';
