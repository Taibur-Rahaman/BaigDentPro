import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncRoute } from '../utils/routeErrors.js';

const router = Router();

function readMasterSiteLogo(settings: unknown): string {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return '';
  const value = (settings as Record<string, unknown>).masterSiteLogo;
  return typeof value === 'string' ? value.trim() : '';
}

router.get(
  '/public',
  asyncRoute('branding.public', async (_req, res) => {
    const brandingClinicId = (process.env.MASTER_BRANDING_CLINIC_ID || 'seed-clinic-baigdentpro').trim();
    const clinic = await prisma.clinic.findUnique({
      where: { id: brandingClinicId },
      select: { settings: true, updatedAt: true },
    });
    const masterLogoUrl = readMasterSiteLogo(clinic?.settings);
    res.json({
      masterLogoUrl,
      version: clinic?.updatedAt?.toISOString() ?? '',
    });
  })
);

export default router;
