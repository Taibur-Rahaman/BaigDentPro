import React, { useEffect, useState } from 'react';
import api from '@/api';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { setCachedSiteLogoUrl } from '@/lib/siteBranding';

export const AdminBrandingPage: React.FC = () => {
  const { showSuccess, showError } = useToastBridge();
  const [masterLogo, setMasterLogo] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    void api.admin
      .masterLogo()
      .then((data) => {
        setMasterLogo(data.logo || '');
      })
      .catch(() => {});
  }, []);

  const toSquarePngDataUrl = async (file: File): Promise<string> => {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const src = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(src);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(src);
        reject(new Error('Could not read image'));
      };
      image.src = src;
    });
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    const srcW = source.naturalWidth;
    const srcH = source.naturalHeight;
    const crop = Math.min(srcW, srcH);
    const sx = Math.floor((srcW - crop) / 2);
    const sy = Math.floor((srcH - crop) / 2);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, sx, sy, crop, crop, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  };

  const saveMasterLogo = async (dataUrl: string) => {
    setLogoBusy(true);
    try {
      const saved = await api.admin.updateMasterLogo(dataUrl);
      const logo = saved.logo || '';
      setMasterLogo(logo);
      setCachedSiteLogoUrl(logo);
      showSuccess('Master logo updated for the full site.');
    } catch (error: unknown) {
      showError(userMessageFromUnknown(error));
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Branding</h1>
        <p className="tenant-page-lead">Super Admin master logo control for full site branding.</p>
      </div>
      <section className="tenant-card" style={{ padding: 16, maxWidth: 680 }}>
        <h3 style={{ margin: '0 0 8px' }}>Master Site Logo</h3>
        <p style={{ margin: '0 0 12px', color: '#64748b' }}>
          Upload once to update the brand logo globally. Image is auto-cropped to 1:1 and resized to 512x512.
        </p>
        {masterLogo ? (
          <img
            src={masterLogo}
            alt="Master site logo preview"
            style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 12, border: '1px solid #cbd5e1' }}
          />
        ) : null}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="neo-btn neo-btn-secondary" style={{ cursor: logoBusy ? 'wait' : 'pointer' }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={logoBusy}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void toSquarePngDataUrl(file).then(saveMasterLogo).catch((error: unknown) => {
                  showError(userMessageFromUnknown(error));
                });
                e.currentTarget.value = '';
              }}
            />
            {logoBusy ? 'Processing...' : 'Upload & apply logo'}
          </label>
          <button
            type="button"
            className="neo-btn neo-btn-secondary"
            disabled={logoBusy || !masterLogo}
            onClick={() => void saveMasterLogo('')}
          >
            Clear master logo
          </button>
        </div>
      </section>
    </div>
  );
};
