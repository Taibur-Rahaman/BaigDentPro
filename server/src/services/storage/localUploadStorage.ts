import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type StoredUpload = {
  fileName: string;
  localPath: string;
  publicUrl: string;
};

function ensureUploadsDir(): string {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

export function buildUploadPublicBase(originHint?: string): string {
  const fallback = (process.env.PUBLIC_UPLOAD_BASE_URL || 'https://api.baigdentpro.com').trim();
  if (!originHint) return fallback;
  if (/^https?:\/\//i.test(originHint)) return originHint;
  return fallback;
}

export function storeLocalUpload(buffer: Buffer, clinicId: string, ext: string, publicBase: string): StoredUpload {
  const uploadsDir = ensureUploadsDir();
  const fileName = `${clinicId}-${randomUUID()}${ext}`;
  const localPath = path.join(uploadsDir, fileName);
  fs.writeFileSync(localPath, buffer);
  return {
    fileName,
    localPath,
    publicUrl: `${publicBase.replace(/\/$/, '')}/uploads/${fileName}`,
  };
}

export function deleteLocalUploadByPublicUrl(fileUrl: string): void {
  if (!fileUrl || !fileUrl.includes('/uploads/')) return;
  try {
    const pathname = new URL(fileUrl).pathname;
    if (!pathname.startsWith('/uploads/')) return;
    const fileName = path.basename(pathname);
    const abs = path.resolve(process.cwd(), 'uploads', fileName);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads') + path.sep;
    if (!abs.startsWith(uploadsRoot)) return;
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // Ignore cleanup errors
  }
}
