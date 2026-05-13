import React from 'react';
import { ApiError } from '@/components/ApiError';
import { useClinicProfileEditorView } from '@/hooks/view/useClinicProfileEditorView';

export const ClinicProfilePage: React.FC = () => {
  const {
    profile,
    name,
    setName,
    address,
    setAddress,
    phone,
    setPhone,
    email,
    setEmail,
    timezone,
    setTimezone,
    logo,
    loading,
    saving,
    error,
    saveMsg,
    logoHint,
    reload,
    onLogoFile,
    saveProfile,
    clearLogo,
  } = useClinicProfileEditorView();

  if (loading) {
    return (
      <div className="tenant-page">
        <p className="tenant-page-lead">Loading clinic profile…</p>
      </div>
    );
  }

  return (
    <div className="tenant-page">
      <h1 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Clinic profile</h1>
      <p className="tenant-page-lead">
        Public-facing clinic details. Changes are saved to <code>/api/clinic/profile</code>.
      </p>
      {error ? <ApiError message={error} title="Could not load or save profile" onRetry={() => void reload()} /> : null}

      {profile ? (
        <form
          onSubmit={(e) => void saveProfile(e)}
          className="neo-stack"
          style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}
        >
          <p style={{ margin: 0, fontSize: 13, color: 'var(--neo-text-muted, #64748b)' }}>
            Plan <strong>{profile.plan}</strong>
            {' · '}
            Region <strong>{profile.region}</strong>
            {' · '}
            {profile.isActive ? 'Active' : 'Inactive'}
          </p>

          <label className="neo-field">
            <span>Clinic name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={200} />
          </label>
          <label className="neo-field">
            <span>Address</span>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={500} />
          </label>
          <label className="neo-field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </label>
          <label className="neo-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={320} />
          </label>
          <label className="neo-field">
            <span>Timezone (IANA)</span>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Dhaka"
              maxLength={120}
            />
          </label>

          <div className="neo-field">
            <span>Logo</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logo ? (
                <img src={logo} alt="Clinic logo preview" style={{ maxWidth: 160, maxHeight: 160, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 13, color: 'var(--neo-text-muted, #64748b)' }}>No logo set</span>
              )}
              <input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)} />
              {logo ? (
                <button type="button" className="neo-btn neo-btn-secondary" onClick={clearLogo}>
                  Remove logo
                </button>
              ) : null}
              {logoHint ? (
                <p style={{ color: '#b45309', margin: 0, fontSize: 13 }} role="status">
                  {logoHint}
                </p>
              ) : null}
            </div>
          </div>

          {saveMsg ? (
            <p style={{ color: '#15803d', margin: 0 }} role="status">
              {saveMsg}
            </p>
          ) : null}
          <button type="submit" className="neo-btn neo-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      ) : null}
    </div>
  );
};
