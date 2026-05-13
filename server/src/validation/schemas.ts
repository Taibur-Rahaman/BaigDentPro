import { z } from 'zod';

const emailSchema = z.string().min(3).max(320);

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(500),
});

export const registerSaasBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(500),
  name: z.string().min(1).max(200).optional(),
});

export const registerClinicBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(500),
  name: z.string().min(1).max(200),
  clinicName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  title: z.string().max(80).optional(),
  degree: z.string().max(200).optional(),
});

/** Super Admin approves self-service clinic signup; assigns role, optional catalog plan, professional fields. */
export const superAdminCapabilityOverridesPutBodySchema = z
  .object({
    overrides: z
      .array(
        z
          .object({
            capabilityKey: z.string().min(1).max(120),
            grant: z.boolean(),
          })
          .strict(),
      )
      .max(500),
  })
  .strict();

export const approveSignupBodySchema = z
  .object({
    role: z
      .enum([
        'CLINIC_ADMIN',
        'CLINIC_OWNER',
        'DOCTOR',
        'STORE_MANAGER',
        'RECEPTIONIST',
        'LAB_TECH',
        'DENTAL_ASSISTANT',
      ])
      .default('CLINIC_ADMIN'),
    title: z.string().max(80).optional().nullable(),
    degree: z.string().max(200).optional().nullable(),
    specialization: z.string().max(200).optional().nullable(),
    professionalVerified: z.boolean().optional(),
    catalogPlanName: z.enum(['FREE', 'PLATINUM', 'PREMIUM', 'LUXURY']).optional(),
  })
  .strict();

export const productCreateBodySchema = z.object({
  name: z.string().min(1).max(500),
  price: z.coerce.number().finite().nonnegative(),
  costPrice: z.coerce.number().finite().nonnegative().optional(),
  imageUrl: z.string().max(2048).optional().nullable(),
});

export const productUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    price: z.coerce.number().finite().nonnegative().optional(),
    costPrice: z.coerce.number().finite().nonnegative().optional(),
    imageUrl: z.string().max(2048).optional().nullable(),
  })
  .refine(
    (b) =>
      b.name !== undefined || b.price !== undefined || b.costPrice !== undefined || b.imageUrl !== undefined,
    {
      message: 'At least one of name, price, costPrice, imageUrl is required',
    }
  );

export const authRefreshBodySchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

export const authLogoutBodySchema = z.object({
  refreshToken: z.string().min(20).max(4096).optional(),
});

export const authLogoutAllBodySchema = z.object({}).strict();

const lineItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(100_000),
});

export const orderCreateBodySchema = z.union([
  z.object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive().max(100_000),
  }),
  z.object({
    items: z.array(lineItemSchema).min(1).max(100),
  }),
]);

export const syncPrismaPasswordBodySchema = z.object({
  password: z.string().min(8).max(500),
});

export const adminUpgradePlanBodySchema = z.object({
  clinicId: z.string().min(1).max(200),
  planName: z.enum(['PLATINUM', 'PREMIUM', 'LUXURY', 'FREE']),
});

export const adminDisableClinicBodySchema = z.object({
  clinicId: z.string().min(1).max(200),
  disabled: z.boolean(),
});

export const adminMasterLogoUpdateBodySchema = z.object({
  logo: z.union([z.string().max(65_000), z.literal('')]),
});

export const branchCreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().nullable(),
});

export const branchUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).optional().nullable(),
  })
  .refine((b) => b.name !== undefined || b.address !== undefined, { message: 'Nothing to update' });

/** Logo as data URL or remote URL; capped to fit MySQL `TEXT` (~64KiB). */
const clinicLogoSchema = z.union([z.string().max(65_000), z.literal('')]).nullable();

export const clinicProfileUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    email: z.union([z.string().email().max(320), z.literal('')]).optional().nullable(),
    logo: clinicLogoSchema.optional(),
    timezone: z.string().min(1).max(120).optional().nullable(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.address !== undefined ||
      b.phone !== undefined ||
      b.email !== undefined ||
      b.logo !== undefined ||
      b.timezone !== undefined,
    { message: 'Nothing to update' }
  );

export const clinicSettingsUpdateBodySchema = z
  .object({
    clinicName: z.string().min(1).max(200).optional(),
    logo: clinicLogoSchema.optional(),
    address: z.string().max(500).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    email: z.union([z.string().email().max(320), z.literal('')]).optional().nullable(),
    useCustomPad: z.boolean().optional(),
    doctorLogo: clinicLogoSchema.optional(),
    printShowHeader: z.boolean().optional(),
    printShowFooter: z.boolean().optional(),
    printMarginTopMm: z.coerce.number().min(0).max(30).optional(),
    printMarginBottomMm: z.coerce.number().min(0).max(30).optional(),
    printMarginLeftMm: z.coerce.number().min(0).max(30).optional(),
    printMarginRightMm: z.coerce.number().min(0).max(30).optional(),
    printLayoutMode: z.enum(['medical', 'hospital']).optional(),
    printPageBorderEnabled: z.boolean().optional(),
    printBorderWidthPt: z.coerce.number().min(0.25).max(6).optional(),
    printBorderMeasureFrom: z.enum(['page_edge', 'text_margin']).optional(),
    printBorderOffsetMm: z.coerce.number().min(0).max(14).optional(),
    printCenterHorizontal: z.boolean().optional(),
    printCenterVertical: z.boolean().optional(),
    watermarkText: z.string().max(120).optional(),
    watermarkOpacity: z.coerce.number().min(0.05).max(0.3).optional(),
    watermarkPosition: z.enum(['center', 'top', 'bottom']).optional(),
    watermarkFontSize: z.coerce.number().int().min(20).max(80).optional(),
    watermarkRotation: z.coerce.number().min(-180).max(180).optional(),
    ifMatchVersion: z.string().datetime().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'Nothing to update' });

export const authProfileBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().max(40).optional().nullable(),
    clinicName: z.string().max(200).optional().nullable(),
    clinicAddress: z.string().max(500).optional().nullable(),
    clinicPhone: z.string().max(40).optional().nullable(),
    clinicEmail: z.union([z.string().email().max(320), z.literal('')]).optional().nullable(),
    title: z.string().max(80).optional().nullable(),
    degree: z.string().max(200).optional().nullable(),
    specialization: z.string().max(200).optional().nullable(),
    licenseNo: z.string().max(100).optional().nullable(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'At least one field is required' });

export const authPasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(8).max(500),
});

const inviteRoleSchema = z.enum(['DOCTOR', 'RECEPTIONIST', 'ADMIN', 'STORE_MANAGER']);

export const inviteCreateBodySchema = z.object({
  email: emailSchema,
  role: inviteRoleSchema,
  branchId: z.string().uuid().optional().nullable(),
  clinicId: z.string().min(1).max(64).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(60).optional().default(14),
});

export const inviteAcceptBodySchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(500),
});

export const subscriptionUpgradeBodySchema = z
  .object({
    planId: z.string().uuid().optional(),
    planName: z.string().min(1).max(120).optional(),
    clinicId: z.string().min(1).max(64).optional(),
    durationDays: z.coerce.number().int().min(1).max(3650).optional().default(365),
    autoRenew: z.boolean().optional(),
    /** Optional: references a `SubscriptionPayment` already marked `PAID` by super-admin (manual WhatsApp flow). */
    verifiedPaymentId: z.string().uuid().optional(),
  })
  .refine((b) => Boolean(b.planId || b.planName || b.verifiedPaymentId), {
    message: 'planId, planName, or verifiedPaymentId is required',
  });

/** Manual WhatsApp subscription payment — no online gateway. */
export const manualPaymentInitiateBodySchema = z.object({
  planCode: z.string().min(2).max(32),
  clinicId: z.string().min(1).max(64).optional(),
  /** Optional override in minor units (1 BDT = 100). Defaults to catalog plan price × 100. */
  amountMinor: z.coerce.number().int().positive().max(100_000_000).optional(),
});

export type ManualPaymentInitiateBody = z.infer<typeof manualPaymentInitiateBodySchema>;

export const activityTimelineQuerySchema = z.object({
  userId: z.string().min(1).max(64).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const patientPortalRequestOtpBodySchema = z.object({
  phone: z.string().min(5).max(40),
  clinicId: z.string().min(1).max(64),
});

export const patientPortalVerifyOtpBodySchema = z.object({
  phone: z.string().min(5).max(40),
  clinicId: z.string().min(1).max(64),
  code: z.string().regex(/^\d{6}$/),
});

export const patientPortalRefreshBodySchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

export const patientPortalProfileUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.union([z.string().email().max(320), z.literal('')]).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
  })
  .refine((b) => b.name !== undefined || b.email !== undefined || b.address !== undefined, {
    message: 'Nothing to update',
  });

export const patientPortalBookAppointmentBodySchema = z.object({
  date: z.string().min(8).max(40),
  time: z.string().min(1).max(20),
  duration: z.coerce.number().int().min(10).max(480).optional().default(30),
  notes: z.string().max(2000).optional().nullable(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterSaasBody = z.infer<typeof registerSaasBodySchema>;
export type RegisterClinicBody = z.infer<typeof registerClinicBodySchema>;
export type ApproveSignupBody = z.infer<typeof approveSignupBodySchema>;
export type OrderCreateBody = z.infer<typeof orderCreateBodySchema>;
export type AuthProfileBody = z.infer<typeof authProfileBodySchema>;
export type InviteCreateBody = z.infer<typeof inviteCreateBodySchema>;
export type InviteAcceptBody = z.infer<typeof inviteAcceptBodySchema>;
export type SubscriptionUpgradeBody = z.infer<typeof subscriptionUpgradeBodySchema>;
