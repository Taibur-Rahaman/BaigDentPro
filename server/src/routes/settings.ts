import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireActiveSubscription } from '../middleware/clinicSubscription.js';
import { requireSaaSClinicScopeAlignment } from '../middleware/tenantClinicGuard.js';
import { validateBody } from '../middleware/validateBody.js';
import { clinicSettingsUpdateBodySchema } from '../validation/schemas.js';
import { asyncRoute } from '../utils/routeErrors.js';

const router = Router();

type WatermarkPosition = 'center' | 'top' | 'bottom';
type PrintLayoutMode = 'medical' | 'hospital';
type PrintBorderMeasureFrom = 'page_edge' | 'text_margin';

function clinicIdFromReq(req: AuthRequest): string | null {
  return req.businessClinicId ?? req.effectiveClinicId ?? req.user?.clinicId ?? null;
}

function assertClinicScope(req: AuthRequest, clinicId: string): boolean {
  if (req.user?.role === 'SUPER_ADMIN') return true;
  return req.user?.clinicId === clinicId;
}

function sanitizeSettings(raw: unknown) {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const marginOr = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(30, Math.round(value * 10) / 10)) : fallback;
  return {
    useCustomPad: src.useCustomPad === true,
    doctorLogo: typeof src.doctorLogo === 'string' ? src.doctorLogo : '',
    printShowHeader: src.printShowHeader !== false,
    printShowFooter: src.printShowFooter !== false,
    printMarginTopMm: marginOr(src.printMarginTopMm, 10),
    printMarginBottomMm: marginOr(src.printMarginBottomMm, 10),
    printMarginLeftMm: marginOr(src.printMarginLeftMm, 10),
    printMarginRightMm: marginOr(src.printMarginRightMm, 10),
    printLayoutMode: src.printLayoutMode === 'hospital' ? ('hospital' as PrintLayoutMode) : ('medical' as PrintLayoutMode),
    printPageBorderEnabled: src.printPageBorderEnabled === true,
    printBorderWidthPt:
      typeof src.printBorderWidthPt === 'number' && Number.isFinite(src.printBorderWidthPt)
        ? Math.max(0.25, Math.min(6, Math.round(src.printBorderWidthPt * 4) / 4))
        : 1.5,
    printBorderMeasureFrom:
      src.printBorderMeasureFrom === 'text_margin' ? ('text_margin' as PrintBorderMeasureFrom) : ('page_edge' as PrintBorderMeasureFrom),
    printBorderOffsetMm:
      typeof src.printBorderOffsetMm === 'number' && Number.isFinite(src.printBorderOffsetMm)
        ? Math.max(0, Math.min(14, Math.round(src.printBorderOffsetMm * 10) / 10))
        : 3,
    printCenterHorizontal: src.printCenterHorizontal === true,
    printCenterVertical: src.printCenterVertical === true,
    watermarkText: typeof src.watermarkText === 'string' ? src.watermarkText : '',
    watermarkOpacity:
      typeof src.watermarkOpacity === 'number' && Number.isFinite(src.watermarkOpacity)
        ? Math.max(0.05, Math.min(0.3, src.watermarkOpacity))
        : 0.1,
    watermarkPosition:
      src.watermarkPosition === 'top' || src.watermarkPosition === 'bottom' ? src.watermarkPosition : ('center' as WatermarkPosition),
    watermarkFontSize:
      typeof src.watermarkFontSize === 'number' && Number.isFinite(src.watermarkFontSize)
        ? Math.max(20, Math.min(80, Math.round(src.watermarkFontSize)))
        : 40,
    watermarkRotation:
      typeof src.watermarkRotation === 'number' && Number.isFinite(src.watermarkRotation)
        ? Math.max(-180, Math.min(180, Math.round(src.watermarkRotation)))
        : -25,
  };
}

router.get(
  '/',
  asyncRoute('settings.get', async (req: AuthRequest, res) => {
    const clinicId = clinicIdFromReq(req);
    if (!clinicId) {
      res.status(403).json({ error: 'No clinic context' });
      return;
    }
    if (!assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, logo: true, address: true, phone: true, email: true, settings: true, updatedAt: true },
    });
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found' });
      return;
    }
    const settings = sanitizeSettings(clinic.settings);
    res.json({
      clinicId: clinic.id,
      clinicName: clinic.name,
      logo: clinic.logo ?? '',
      address: clinic.address ?? '',
      phone: clinic.phone ?? '',
      email: clinic.email ?? '',
      settingsVersion: clinic.updatedAt.toISOString(),
      ...settings,
    });
  })
);

router.put(
  '/',
  requireRole('ADMIN'),
  requireActiveSubscription,
  requireSaaSClinicScopeAlignment,
  validateBody(clinicSettingsUpdateBodySchema),
  asyncRoute('settings.put', async (req: AuthRequest, res) => {
    const clinicId = clinicIdFromReq(req);
    if (!clinicId) {
      res.status(403).json({ error: 'No clinic context' });
      return;
    }
    if (!assertClinicScope(req, clinicId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { settings: true, updatedAt: true } });
    if (!clinic) {
      res.status(404).json({ error: 'Clinic not found' });
      return;
    }
    const prior = sanitizeSettings(clinic.settings);
    const ifMatchVersion = typeof body.ifMatchVersion === 'string' ? body.ifMatchVersion.trim() : '';
    if (ifMatchVersion && clinic.updatedAt.toISOString() !== ifMatchVersion) {
      res.status(409).json({ error: 'Settings were updated from another session. Reload and try again.' });
      return;
    }
    const next = {
      useCustomPad: typeof body.useCustomPad === 'boolean' ? body.useCustomPad : prior.useCustomPad,
      doctorLogo: typeof body.doctorLogo === 'string' ? body.doctorLogo : prior.doctorLogo,
      printShowHeader: typeof body.printShowHeader === 'boolean' ? body.printShowHeader : prior.printShowHeader,
      printShowFooter: typeof body.printShowFooter === 'boolean' ? body.printShowFooter : prior.printShowFooter,
      printMarginTopMm:
        typeof body.printMarginTopMm === 'number'
          ? Math.max(0, Math.min(30, Math.round(body.printMarginTopMm * 10) / 10))
          : prior.printMarginTopMm,
      printMarginBottomMm:
        typeof body.printMarginBottomMm === 'number'
          ? Math.max(0, Math.min(30, Math.round(body.printMarginBottomMm * 10) / 10))
          : prior.printMarginBottomMm,
      printMarginLeftMm:
        typeof body.printMarginLeftMm === 'number'
          ? Math.max(0, Math.min(30, Math.round(body.printMarginLeftMm * 10) / 10))
          : prior.printMarginLeftMm,
      printMarginRightMm:
        typeof body.printMarginRightMm === 'number'
          ? Math.max(0, Math.min(30, Math.round(body.printMarginRightMm * 10) / 10))
          : prior.printMarginRightMm,
      printLayoutMode:
        body.printLayoutMode === 'hospital' || body.printLayoutMode === 'medical'
          ? body.printLayoutMode
          : prior.printLayoutMode,
      printPageBorderEnabled:
        typeof body.printPageBorderEnabled === 'boolean' ? body.printPageBorderEnabled : prior.printPageBorderEnabled,
      printBorderWidthPt:
        typeof body.printBorderWidthPt === 'number'
          ? Math.max(0.25, Math.min(6, Math.round(body.printBorderWidthPt * 4) / 4))
          : prior.printBorderWidthPt,
      printBorderMeasureFrom:
        body.printBorderMeasureFrom === 'text_margin' || body.printBorderMeasureFrom === 'page_edge'
          ? body.printBorderMeasureFrom
          : prior.printBorderMeasureFrom,
      printBorderOffsetMm:
        typeof body.printBorderOffsetMm === 'number'
          ? Math.max(0, Math.min(14, Math.round(body.printBorderOffsetMm * 10) / 10))
          : prior.printBorderOffsetMm,
      printCenterHorizontal:
        typeof body.printCenterHorizontal === 'boolean' ? body.printCenterHorizontal : prior.printCenterHorizontal,
      printCenterVertical:
        typeof body.printCenterVertical === 'boolean' ? body.printCenterVertical : prior.printCenterVertical,
      watermarkText: typeof body.watermarkText === 'string' ? body.watermarkText : prior.watermarkText,
      watermarkOpacity:
        typeof body.watermarkOpacity === 'number'
          ? Math.max(0.05, Math.min(0.3, body.watermarkOpacity))
          : prior.watermarkOpacity,
      watermarkPosition:
        body.watermarkPosition === 'top' || body.watermarkPosition === 'bottom' || body.watermarkPosition === 'center'
          ? body.watermarkPosition
          : prior.watermarkPosition,
      watermarkFontSize:
        typeof body.watermarkFontSize === 'number'
          ? Math.max(20, Math.min(80, Math.round(body.watermarkFontSize)))
          : prior.watermarkFontSize,
      watermarkRotation:
        typeof body.watermarkRotation === 'number'
          ? Math.max(-180, Math.min(180, Math.round(body.watermarkRotation)))
          : prior.watermarkRotation,
    };
    const updated = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...(typeof body.clinicName === 'string' ? { name: body.clinicName.trim() } : {}),
        ...(body.logo !== undefined
          ? { logo: body.logo === null || body.logo === '' ? null : String(body.logo) }
          : {}),
        ...(body.address !== undefined
          ? { address: body.address === null ? null : String(body.address).trim() }
          : {}),
        ...(body.phone !== undefined ? { phone: body.phone === null ? null : String(body.phone).trim() } : {}),
        ...(body.email !== undefined
          ? { email: body.email === null || body.email === '' ? null : String(body.email).trim() }
          : {}),
        settings: next,
      },
      select: { id: true, name: true, logo: true, address: true, phone: true, email: true, settings: true, updatedAt: true },
    });
    res.json({
      clinicId: updated.id,
      clinicName: updated.name,
      logo: updated.logo ?? '',
      address: updated.address ?? '',
      phone: updated.phone ?? '',
      email: updated.email ?? '',
      settingsVersion: updated.updatedAt.toISOString(),
      ...sanitizeSettings(updated.settings),
    });
  })
);

export default router;
