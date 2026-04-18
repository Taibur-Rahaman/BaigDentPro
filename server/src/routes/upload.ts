import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireSaaSClinicScopeAlignment } from '../middleware/tenantClinicGuard.js';
import { requireTenantIsolation } from '../middleware/requireTenantIsolation.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { getSupabaseAdmin } from '../utils/supabaseServer.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extForMime(mime: string, originalName?: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  const fromName = extname(originalName || '');
  return fromName || '.bin';
}

router.post(
  '/',
  requireRole('SAAS_TENANT'),
  requireTenantIsolation,
  requireSaaSClinicScopeAlignment,
  upload.single('file'),
  asyncRoute('upload.image', async (req: AuthRequest, res: Response) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      res.status(503).json({ success: false, error: 'File storage is not configured (Supabase)' });
      return;
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'saas-uploads';
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ success: false, error: 'Missing file field (multipart name: file)' });
      return;
    }
    if (!ALLOWED.has(file.mimetype)) {
      res.status(400).json({ success: false, error: 'Unsupported file type' });
      return;
    }

    const clinicId = req.clinicSubscription!.clinicId;
    const ext = extForMime(file.mimetype, file.originalname);
    const objectPath = `${clinicId}/${randomUUID()}${ext}`;

    const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (upErr) {
      console.error('[upload]', upErr.message);
      res.status(502).json({ success: false, error: 'Upload failed' });
      return;
    }

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      res.status(502).json({ success: false, error: 'Could not resolve public URL' });
      return;
    }

    res.status(201).json({ success: true, data: { url: publicUrl } });
  })
);

export default router;
