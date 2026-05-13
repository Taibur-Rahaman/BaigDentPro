import { extname } from 'node:path';
import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireSaaSClinicScopeAlignment } from '../middleware/tenantClinicGuard.js';
import { requireTenantIsolation } from '../middleware/requireTenantIsolation.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { prisma } from '../db/prisma.js';
import { isClinicAdministratorRole, isSuperAdminRole } from '../security/rbac.js';
import {
  buildUploadPublicBase,
  deleteLocalUploadByPublicUrl,
  storeLocalUpload,
} from '../services/storage/localUploadStorage.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
type UploadAssetType = 'general' | 'clinicLogo' | 'doctorLogo';

function extForMime(mime: string, originalName?: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  const fromName = extname(originalName || '');
  return fromName || '.bin';
}

function detectMimeBySignature(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) return 'image/png';
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF87a') return 'image/gif';
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  return null;
}

router.post(
  '/',
  requireRole('ADMIN', 'SAAS_TENANT', 'DOCTOR', 'RECEPTIONIST', 'LAB_TECH', 'DENTAL_ASSISTANT'),
  requireTenantIsolation,
  requireSaaSClinicScopeAlignment,
  upload.single('file'),
  asyncRoute('upload.image', async (req: AuthRequest, res: Response) => {
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ success: false, error: 'Missing file field (multipart name: file)' });
      return;
    }
    const sniffed = detectMimeBySignature(file.buffer);
    if (!sniffed || !ALLOWED.has(sniffed) || (file.mimetype && !ALLOWED.has(file.mimetype))) {
      res.status(400).json({ success: false, error: 'Unsupported file type' });
      return;
    }

    const clinicId = req.clinicSubscription!.clinicId;
    const rawType = typeof req.body?.assetType === 'string' ? req.body.assetType.trim() : '';
    const assetType: UploadAssetType =
      rawType === 'clinicLogo' || rawType === 'doctorLogo' ? rawType : 'general';
    const uplRole = (req.user?.role ?? '').trim();
    if (assetType === 'clinicLogo') {
      if (!isSuperAdminRole(uplRole) && !isClinicAdministratorRole(uplRole)) {
        res.status(403).json({
          success: false,
          error: 'Only clinic administrators may update the clinic logo',
        });
        return;
      }
    }
    if (assetType === 'doctorLogo') {
      const ok =
        isSuperAdminRole(uplRole) ||
        isClinicAdministratorRole(uplRole) ||
        uplRole === 'DOCTOR';
      if (!ok) {
        res.status(403).json({
          success: false,
          error: 'Only clinic administrators or doctors may update doctor branding images',
        });
        return;
      }
    }
    const ext = extForMime(sniffed, file.originalname);
    const publicBase = buildUploadPublicBase(process.env.PUBLIC_UPLOAD_BASE_URL);
    const stored = storeLocalUpload(file.buffer, clinicId, ext, publicBase);
    const publicUrl = stored.publicUrl;

    if (assetType === 'clinicLogo' || assetType === 'doctorLogo') {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { logo: true, settings: true },
      });
      if (!clinic) {
        res.status(404).json({ success: false, error: 'Clinic not found' });
        return;
      }
      const prevSettings =
        clinic.settings && typeof clinic.settings === 'object' && !Array.isArray(clinic.settings)
          ? (clinic.settings as Record<string, unknown>)
          : {};
      const prevClinicLogo = typeof clinic.logo === 'string' ? clinic.logo : '';
      const prevDoctorLogo =
        typeof prevSettings.doctorLogo === 'string' ? String(prevSettings.doctorLogo) : '';
      if (assetType === 'clinicLogo') {
        await prisma.clinic.update({ where: { id: clinicId }, data: { logo: publicUrl } });
        if (prevClinicLogo && prevClinicLogo !== publicUrl) deleteLocalUploadByPublicUrl(prevClinicLogo);
      } else {
        await prisma.clinic.update({
          where: { id: clinicId },
          data: { settings: { ...prevSettings, doctorLogo: publicUrl } },
        });
        if (prevDoctorLogo && prevDoctorLogo !== publicUrl) deleteLocalUploadByPublicUrl(prevDoctorLogo);
      }
    }

    res.status(201).json({ success: true, data: { url: publicUrl, assetType } });
  })
);

export default router;
