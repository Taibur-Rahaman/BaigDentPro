import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { manualPaymentInitiateBodySchema, type ManualPaymentInitiateBody } from '../validation/schemas.js';
import { blockImpersonationBilling } from '../middleware/blockImpersonationBilling.js';
import {
  adminWhatsAppDigits,
  buildManualWhatsAppUrl,
  fillPaymentTemplate,
  PAYMENT_METHOD,
  WHATSAPP_MESSAGE_TEMPLATE,
} from '../config/paymentPolicy.js';

const router = Router();

router.use(requireRole('CLINIC_ADMIN', 'CLINIC_OWNER', 'SUPER_ADMIN'));
router.use(blockImpersonationBilling);

function resolveClinicId(req: AuthRequest, bodyClinicId?: string): string | null {
  if (req.user!.role === 'SUPER_ADMIN') {
    return bodyClinicId?.trim() || null;
  }
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId ?? null;
}

/**
 * Create a pending subscription payment + WhatsApp deep link (no online gateway).
 * POST /api/payment/manual/initiate
 */
router.post(
  '/manual/initiate',
  validateBody(manualPaymentInitiateBodySchema),
  asyncRoute('payment.manual.initiate', async (req: AuthRequest, res: Response) => {
    const body = req.body as ManualPaymentInitiateBody;
    const clinicId = resolveClinicId(req, body.clinicId);
    if (!clinicId) {
      res.status(400).json({ success: false, error: 'clinicId is required for platform administrators' });
      return;
    }
    const scoped = req.businessClinicId ?? req.effectiveClinicId ?? req.user!.clinicId;
    if (req.user!.role !== 'SUPER_ADMIN' && clinicId !== scoped) {
      res.status(403).json({ success: false, error: 'Cannot bill another clinic' });
      return;
    }

    const planCode = body.planCode.trim().toUpperCase();
    const plan = await prisma.plan.findFirst({
      where: { name: { equals: planCode, mode: 'insensitive' } },
    });
    if (!plan) {
      res.status(404).json({ success: false, error: 'Plan not found' });
      return;
    }

    const amountMinor =
      typeof body.amountMinor === 'number' && Number.isFinite(body.amountMinor) && body.amountMinor > 0
        ? Math.round(body.amountMinor)
        : Math.round(plan.price * 100);

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });
    const clinicName = clinic?.name ?? '';

    const row = await prisma.subscriptionPayment.create({
      data: {
        clinicId,
        userId: req.user!.id,
        amount: amountMinor,
        method: PAYMENT_METHOD,
        status: 'PENDING',
        planCode,
        planName: plan.name,
        metadata: { source: 'manual_whatsapp_initiate', policy: PAYMENT_METHOD },
      },
      select: {
        id: true,
        clinicId: true,
        amount: true,
        method: true,
        status: true,
        planCode: true,
        planName: true,
        createdAt: true,
      },
    });

    const amountDisplay = (amountMinor / 100).toFixed(2);
    const userName = (req.user!.name && req.user!.name.trim()) || req.user!.email || 'User';
    const message = fillPaymentTemplate(WHATSAPP_MESSAGE_TEMPLATE, {
      planName: plan.name,
      amount: amountDisplay,
      userName,
      userEmail: req.user!.email,
      clinicName,
      invoiceId: row.id,
      date: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
    });

    const whatsappUrl = buildManualWhatsAppUrl(adminWhatsAppDigits(), message);

    res.status(201).json({
      success: true,
      data: {
        payment: row,
        whatsappUrl,
        paymentMethod: PAYMENT_METHOD,
      },
    });
  })
);

export default router;
