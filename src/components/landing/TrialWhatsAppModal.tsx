import React, { useEffect, useId, useState } from 'react';
import { REQUEST_TRIAL_WHATSAPP_LABEL } from '@/components/landing/RequestTrialWhatsAppButton';
import { buildTrialWhatsAppUrl, type TrialWhatsAppPayload } from '@/components/landing/trialWhatsApp';

export interface TrialWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
}

export const TrialWhatsAppModal: React.FC<TrialWhatsAppModalProps> = ({ open, onClose }) => {
  const titleId = useId();
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleWhatsApp = () => {
    const payload: TrialWhatsAppPayload = { fullName, clinicName, phone, email, notes };
    if (!fullName.trim() || !phone.trim()) {
      return;
    }
    const url = buildTrialWhatsAppUrl(payload);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const canSubmit = fullName.trim().length > 0 && clinicName.trim().length > 0 && phone.trim().length > 0;

  return (
    <div
      className="bdp-trial-modal-root"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bdp-trial-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bdp-trial-modal__head">
          <h2 id={titleId} className="bdp-trial-modal__title">
            {REQUEST_TRIAL_WHATSAPP_LABEL}
          </h2>
          <p className="bdp-trial-modal__sub">
            Add your details. We&apos;ll open WhatsApp with a ready-to-send message. You can edit it before sending.
          </p>
          <button type="button" className="bdp-trial-modal__x" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
        <div className="bdp-trial-modal__body">
          <label className="bdp-trial-field">
            <span className="bdp-trial-label">Your name *</span>
            <input
              className="bdp-trial-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Dr. / full name"
            />
          </label>
          <label className="bdp-trial-field">
            <span className="bdp-trial-label">Clinic or practice name *</span>
            <input
              className="bdp-trial-input"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              autoComplete="organization"
              placeholder="Clinic name, city"
            />
          </label>
          <label className="bdp-trial-field">
            <span className="bdp-trial-label">Phone (WhatsApp) *</span>
            <input
              className="bdp-trial-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              placeholder="e.g. 01XXXXXXXXX"
            />
          </label>
          <label className="bdp-trial-field">
            <span className="bdp-trial-label">Email (optional)</span>
            <input
              className="bdp-trial-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@clinic.com"
            />
          </label>
          <label className="bdp-trial-field">
            <span className="bdp-trial-label">Anything else? (optional)</span>
            <textarea
              className="bdp-trial-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Chairs, branches, timeline…"
            />
          </label>
        </div>
        <div className="bdp-trial-modal__foot">
          <button type="button" className="bdp-btn bdp-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bdp-btn bdp-btn--wa bdp-btn--lg"
            onClick={handleWhatsApp}
            disabled={!canSubmit}
          >
            <i className="fa-brands fa-whatsapp" aria-hidden />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
