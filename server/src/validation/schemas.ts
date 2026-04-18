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
});

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

export const authProfileBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().max(40).optional().nullable(),
    clinicName: z.string().max(200).optional().nullable(),
    clinicAddress: z.string().max(500).optional().nullable(),
    clinicPhone: z.string().max(40).optional().nullable(),
    clinicEmail: z.union([z.string().email().max(320), z.literal('')]).optional().nullable(),
    degree: z.string().max(200).optional().nullable(),
    specialization: z.string().max(200).optional().nullable(),
    licenseNo: z.string().max(100).optional().nullable(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'At least one field is required' });

export const authPasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(8).max(500),
});

const inviteRoleSchema = z.enum(['DOCTOR', 'RECEPTIONIST', 'ADMIN']);

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
    /** Required for clinic admins: a `SubscriptionPayment` row in `SUCCESS` status (Stripe webhook). */
    verifiedPaymentId: z.string().uuid().optional(),
  })
  .refine((b) => Boolean(b.planId || b.planName || b.verifiedPaymentId), {
    message: 'planId, planName, or verifiedPaymentId is required',
  });

export const paymentInitiateBodySchema = z.object({
  amount: z.coerce.number().int().positive().max(100_000_000),
  method: z.enum(['BKASH', 'NAGAD', 'STRIPE']),
  clinicId: z.string().min(1).max(64).optional(),
  /** Target catalog plan (e.g. PREMIUM) for webhook-driven subscription activation. */
  planCode: z.string().min(2).max(32).optional(),
});

export const activityTimelineQuerySchema = z.object({
  userId: z.string().min(1).max(64).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterSaasBody = z.infer<typeof registerSaasBodySchema>;
export type RegisterClinicBody = z.infer<typeof registerClinicBodySchema>;
export type OrderCreateBody = z.infer<typeof orderCreateBodySchema>;
export type AuthProfileBody = z.infer<typeof authProfileBodySchema>;
export type InviteCreateBody = z.infer<typeof inviteCreateBodySchema>;
export type InviteAcceptBody = z.infer<typeof inviteAcceptBodySchema>;
export type SubscriptionUpgradeBody = z.infer<typeof subscriptionUpgradeBodySchema>;
export type PaymentInitiateBody = z.infer<typeof paymentInitiateBodySchema>;
