import React, { useEffect, useState } from 'react';
import api from '@/api';
import { useToastBridge } from '@/components/ToastBridgeProvider';
import { userMessageFromUnknown } from '@/lib/apiErrors';

type FormState = {
  clinicName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  useCustomPad: boolean;
  doctorLogo: string;
  printShowHeader: boolean;
  printShowFooter: boolean;
  printMarginTopMm: number;
  printMarginBottomMm: number;
  printMarginLeftMm: number;
  printMarginRightMm: number;
  printLayoutMode: 'medical' | 'hospital';
  printPageBorderEnabled: boolean;
  printBorderWidthPt: number;
  printBorderMeasureFrom: 'page_edge' | 'text_margin';
  printBorderOffsetMm: number;
  printCenterHorizontal: boolean;
  printCenterVertical: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: 'center' | 'top' | 'bottom';
  watermarkFontSize: number;
  watermarkRotation: number;
  settingsVersion?: string;
};

export const SettingsPage: React.FC = () => {
  const { showSuccess, showError } = useToastBridge();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>({
    clinicName: '',
    logo: '',
    address: '',
    phone: '',
    email: '',
    useCustomPad: false,
    doctorLogo: '',
    printShowHeader: true,
    printShowFooter: true,
    printMarginTopMm: 10,
    printMarginBottomMm: 10,
    printMarginLeftMm: 10,
    printMarginRightMm: 10,
    printLayoutMode: 'medical',
    printPageBorderEnabled: false,
    printBorderWidthPt: 1.5,
    printBorderMeasureFrom: 'page_edge',
    printBorderOffsetMm: 3,
    printCenterHorizontal: false,
    printCenterVertical: false,
    watermarkText: '',
    watermarkOpacity: 0.1,
    watermarkPosition: 'center',
    watermarkFontSize: 40,
    watermarkRotation: -25,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.settings.get();
      setForm({
        clinicName: data.clinicName || '',
        logo: data.logo || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        useCustomPad: Boolean(data.useCustomPad),
        doctorLogo: data.doctorLogo || '',
        printShowHeader: data.printShowHeader !== false,
        printShowFooter: data.printShowFooter !== false,
        printMarginTopMm: Number.isFinite(data.printMarginTopMm) ? data.printMarginTopMm : 10,
        printMarginBottomMm: Number.isFinite(data.printMarginBottomMm) ? data.printMarginBottomMm : 10,
        printMarginLeftMm: Number.isFinite(data.printMarginLeftMm) ? data.printMarginLeftMm : 10,
        printMarginRightMm: Number.isFinite(data.printMarginRightMm) ? data.printMarginRightMm : 10,
        printLayoutMode: data.printLayoutMode === 'hospital' ? 'hospital' : 'medical',
        printPageBorderEnabled: Boolean(data.printPageBorderEnabled),
        printBorderWidthPt:
          typeof data.printBorderWidthPt === 'number' && Number.isFinite(data.printBorderWidthPt)
            ? data.printBorderWidthPt
            : 1.5,
        printBorderMeasureFrom: data.printBorderMeasureFrom === 'text_margin' ? 'text_margin' : 'page_edge',
        printBorderOffsetMm:
          typeof data.printBorderOffsetMm === 'number' && Number.isFinite(data.printBorderOffsetMm)
            ? data.printBorderOffsetMm
            : 3,
        printCenterHorizontal: data.printCenterHorizontal === true,
        printCenterVertical: data.printCenterVertical === true,
        watermarkText: data.watermarkText || '',
        watermarkOpacity: Number.isFinite(data.watermarkOpacity) ? data.watermarkOpacity : 0.1,
        watermarkPosition: data.watermarkPosition || 'center',
        watermarkFontSize: Number.isFinite(data.watermarkFontSize) ? data.watermarkFontSize : 40,
        watermarkRotation: Number.isFinite(data.watermarkRotation) ? data.watermarkRotation : -25,
        settingsVersion: typeof data.settingsVersion === 'string' ? data.settingsVersion : '',
      });
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api.settings.update({
        ...form,
        ifMatchVersion: form.settingsVersion,
      });
      setForm((prev) => ({
        ...prev,
        clinicName: saved.clinicName ?? prev.clinicName,
        logo: saved.logo ?? prev.logo,
        address: saved.address ?? prev.address,
        phone: saved.phone ?? prev.phone,
        email: saved.email ?? prev.email,
        useCustomPad: typeof saved.useCustomPad === 'boolean' ? saved.useCustomPad : prev.useCustomPad,
        doctorLogo: saved.doctorLogo ?? prev.doctorLogo,
        printShowHeader: typeof saved.printShowHeader === 'boolean' ? saved.printShowHeader : prev.printShowHeader,
        printShowFooter: typeof saved.printShowFooter === 'boolean' ? saved.printShowFooter : prev.printShowFooter,
        printMarginTopMm:
          typeof saved.printMarginTopMm === 'number' && Number.isFinite(saved.printMarginTopMm)
            ? saved.printMarginTopMm
            : prev.printMarginTopMm,
        printMarginBottomMm:
          typeof saved.printMarginBottomMm === 'number' && Number.isFinite(saved.printMarginBottomMm)
            ? saved.printMarginBottomMm
            : prev.printMarginBottomMm,
        printMarginLeftMm:
          typeof saved.printMarginLeftMm === 'number' && Number.isFinite(saved.printMarginLeftMm)
            ? saved.printMarginLeftMm
            : prev.printMarginLeftMm,
        printMarginRightMm:
          typeof saved.printMarginRightMm === 'number' && Number.isFinite(saved.printMarginRightMm)
            ? saved.printMarginRightMm
            : prev.printMarginRightMm,
        printLayoutMode: saved.printLayoutMode === 'hospital' ? 'hospital' : 'medical',
        printPageBorderEnabled:
          typeof saved.printPageBorderEnabled === 'boolean' ? saved.printPageBorderEnabled : prev.printPageBorderEnabled,
        printBorderWidthPt:
          typeof saved.printBorderWidthPt === 'number' && Number.isFinite(saved.printBorderWidthPt)
            ? saved.printBorderWidthPt
            : prev.printBorderWidthPt,
        printBorderMeasureFrom:
          saved.printBorderMeasureFrom === 'text_margin' ? 'text_margin' : 'page_edge',
        printBorderOffsetMm:
          typeof saved.printBorderOffsetMm === 'number' && Number.isFinite(saved.printBorderOffsetMm)
            ? saved.printBorderOffsetMm
            : prev.printBorderOffsetMm,
        printCenterHorizontal:
          typeof saved.printCenterHorizontal === 'boolean' ? saved.printCenterHorizontal : prev.printCenterHorizontal,
        printCenterVertical:
          typeof saved.printCenterVertical === 'boolean' ? saved.printCenterVertical : prev.printCenterVertical,
        watermarkText: saved.watermarkText ?? prev.watermarkText,
        watermarkOpacity:
          typeof saved.watermarkOpacity === 'number' && Number.isFinite(saved.watermarkOpacity)
            ? saved.watermarkOpacity
            : prev.watermarkOpacity,
        watermarkPosition:
          saved.watermarkPosition === 'top' || saved.watermarkPosition === 'bottom'
            ? saved.watermarkPosition
            : 'center',
        watermarkFontSize:
          typeof saved.watermarkFontSize === 'number' && Number.isFinite(saved.watermarkFontSize)
            ? saved.watermarkFontSize
            : prev.watermarkFontSize,
        watermarkRotation: Number.isFinite(saved.watermarkRotation) ? saved.watermarkRotation : prev.watermarkRotation,
        settingsVersion: typeof saved.settingsVersion === 'string' ? saved.settingsVersion : prev.settingsVersion,
      }));
      setSuccess('Settings saved successfully.');
      showSuccess('Settings saved successfully.');
    } catch (e) {
      const msg = userMessageFromUnknown(e);
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Settings</h1>
        <p className="tenant-page-lead">
          Clinic profile, prescription pad mode, printer margins / page border (Word-style), and watermark.
        </p>
      </div>
      {error ? <div className="error-message">{error}</div> : null}
      {success ? <div className="success-message">{success}</div> : null}

      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading settings...</span>
        </div>
      ) : (
        <div className="tenant-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <input className="input" placeholder="Clinic name" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
            <input className="input" placeholder="Logo URL or data URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
            <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.useCustomPad} onChange={(e) => setForm({ ...form, useCustomPad: e.target.checked })} />
              Use custom ready pad (hide header/footer)
            </label>
            <input className="input" placeholder="Doctor logo URL" value={form.doctorLogo} onChange={(e) => setForm({ ...form, doctorLogo: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.printShowHeader} onChange={(e) => setForm({ ...form, printShowHeader: e.target.checked })} />
              Show print header
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.printShowFooter} onChange={(e) => setForm({ ...form, printShowFooter: e.target.checked })} />
              Show print footer
            </label>
            <input className="input" type="number" min={0} max={30} step={0.5} value={form.printMarginTopMm} onChange={(e) => setForm({ ...form, printMarginTopMm: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} placeholder="Top margin (mm)" />
            <input className="input" type="number" min={0} max={30} step={0.5} value={form.printMarginBottomMm} onChange={(e) => setForm({ ...form, printMarginBottomMm: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} placeholder="Bottom margin (mm)" />
            <input className="input" type="number" min={0} max={30} step={0.5} value={form.printMarginLeftMm} onChange={(e) => setForm({ ...form, printMarginLeftMm: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} placeholder="Left margin (mm)" />
            <input className="input" type="number" min={0} max={30} step={0.5} value={form.printMarginRightMm} onChange={(e) => setForm({ ...form, printMarginRightMm: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} placeholder="Right margin (mm)" />
            <select className="select" value={form.printLayoutMode} onChange={(e) => setForm({ ...form, printLayoutMode: e.target.value === 'hospital' ? 'hospital' : 'medical' })}>
              <option value="medical">Medical layout</option>
              <option value="hospital">Hospital layout</option>
            </select>
          </div>

          <h3 style={{ marginTop: 20 }}>Print layout (like Microsoft Word Page Setup)</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
            Applies to prescriptions and other printable clinic outputs that use saved margins.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
              <input type="checkbox" checked={form.printPageBorderEnabled} onChange={(e) => setForm({ ...form, printPageBorderEnabled: e.target.checked })} />
              Page border (boxed frame)
            </label>
            <div className="form-group">
              <label className="label" htmlFor="print-border-width">
                Border width (pt)
              </label>
              <input
                id="print-border-width"
                className="input"
                type="number"
                min={0.25}
                max={6}
                step={0.25}
                value={form.printBorderWidthPt}
                disabled={!form.printPageBorderEnabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    printBorderWidthPt: Math.max(0.25, Math.min(6, Number(e.target.value) || 1.5)),
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="print-border-measure">
                Border measured from (Word Page Borders ▸ Options)
              </label>
              <select
                id="print-border-measure"
                className="select"
                value={form.printBorderMeasureFrom}
                disabled={!form.printPageBorderEnabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    printBorderMeasureFrom: e.target.value === 'text_margin' ? 'text_margin' : 'page_edge',
                  })
                }
              >
                <option value="page_edge">Edge of page (within printable margins)</option>
                <option value="text_margin">Inset from margins (toward content)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="print-border-gap">
                Border offset / padding (mm)
              </label>
              <input
                id="print-border-gap"
                className="input"
                type="number"
                min={0}
                max={14}
                step={0.5}
                value={form.printBorderOffsetMm}
                disabled={!form.printPageBorderEnabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    printBorderOffsetMm: Math.max(0, Math.min(14, Number(e.target.value) || 0)),
                  })
                }
              />
            </div>
            <div />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.printCenterHorizontal} onChange={(e) => setForm({ ...form, printCenterHorizontal: e.target.checked })} />
              Center content horizontally on page
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.printCenterVertical} onChange={(e) => setForm({ ...form, printCenterVertical: e.target.checked })} />
              Center content vertically on page
            </label>
          </div>

          <h3 style={{ marginTop: 20 }}>Watermark</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <input className="input" placeholder="Watermark text" value={form.watermarkText} onChange={(e) => setForm({ ...form, watermarkText: e.target.value })} />
            <input className="input" type="number" min={20} max={80} value={form.watermarkFontSize} onChange={(e) => setForm({ ...form, watermarkFontSize: Math.max(20, Math.min(80, Number(e.target.value) || 40)) })} />
            <input className="input" type="number" min={0.05} max={0.3} step={0.01} value={form.watermarkOpacity} onChange={(e) => setForm({ ...form, watermarkOpacity: Math.max(0.05, Math.min(0.3, Number(e.target.value) || 0.1)) })} />
            <select className="select" value={form.watermarkPosition} onChange={(e) => setForm({ ...form, watermarkPosition: e.target.value as FormState['watermarkPosition'] })}>
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
            <input
              className="input"
              type="number"
              min={-180}
              max={180}
              value={form.watermarkRotation}
              onChange={(e) => setForm({ ...form, watermarkRotation: Number(e.target.value) || 0 })}
              placeholder="Rotation"
            />
          </div>
          <div
            style={{
              marginTop: 16,
              position: 'relative',
              height: 180,
              border: '1px dashed #94a3b8',
              borderRadius: 8,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <div
              className="watermark"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                left: '50%',
                top: form.watermarkPosition === 'top' ? '20%' : form.watermarkPosition === 'bottom' ? '80%' : '50%',
                transform: `translate(-50%, -50%) rotate(${form.watermarkRotation}deg)`,
                opacity: form.watermarkOpacity,
                fontSize: `${form.watermarkFontSize}px`,
                color: '#64748b',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                zIndex: 0,
              }}
            >
              {form.watermarkText || 'WATERMARK'}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="button" className="neo-btn neo-btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
