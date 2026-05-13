import React, { useEffect, useId, useRef, useState } from 'react';

export type AdminUserPasswordModalProps = {
  open: boolean;
  userLabel: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
};

/**
 * Accessible password entry for SUPER_ADMIN resets — replaces window.prompt (blocked in many enterprise browsers).
 */
export function AdminUserPasswordModal({ open, userLabel, onCancel, onConfirm }: AdminUserPasswordModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [password, setPassword] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      setPassword('');
      if (!d.open) d.showModal();
      queueMicrotask(() => inputRef.current?.focus());
    } else if (d.open) {
      d.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="adm-password-modal"
      aria-labelledby={labelId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <form
        method="dialog"
        className="adm-password-modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          const p = password.trim();
          if (p.length < 8) return;
          onConfirm(p);
        }}
      >
        <h2 id={labelId} className="adm-password-modal-title">
          Reset password
        </h2>
        <p className="adm-password-modal-lead">{userLabel}</p>
        <label className="adm-password-modal-label">
          New password (min 8 characters)
          <input
            ref={inputRef}
            type="password"
            autoComplete="new-password"
            className="neo-input adm-password-modal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="adm-password-modal-actions">
          <button type="button" className="neo-btn neo-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="neo-btn neo-btn-primary" disabled={password.trim().length < 8}>
            Apply
          </button>
        </div>
      </form>
    </dialog>
  );
}
