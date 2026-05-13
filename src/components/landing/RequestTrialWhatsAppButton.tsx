import React from 'react';

/** Visible label on the CTA (compact). */
export const REQUEST_TRIAL_CTA_LABEL = 'Request a trial';

/** Full phrase for accessibility and the modal headline. */
export const REQUEST_TRIAL_WHATSAPP_LABEL = 'Request a trial on WhatsApp';

export interface RequestTrialWhatsAppButtonProps {
  onClick: () => void;
  size?: 'lg' | 'sm' | 'block';
  density?: 'default' | 'header';
  className?: string;
}

export const RequestTrialWhatsAppButton: React.FC<RequestTrialWhatsAppButtonProps> = ({
  onClick,
  size = 'lg',
  density = 'default',
  className = '',
}) => {
  const sizeClass =
    size === 'block' ? 'bdp-trial-cta bdp-trial-cta--lg bdp-trial-cta--block' :
    size === 'sm' ? 'bdp-trial-cta bdp-trial-cta--sm' :
    'bdp-trial-cta bdp-trial-cta--lg';

  const densityClass = density === 'header' ? ' bdp-trial-cta--header' : '';

  return (
    <button
      type="button"
      className={`${sizeClass}${densityClass}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={REQUEST_TRIAL_WHATSAPP_LABEL}
    >
      <span className="bdp-trial-cta__wa" aria-hidden>
        <i className="fa-brands fa-whatsapp" />
      </span>
      <span className="bdp-trial-cta__label">{REQUEST_TRIAL_CTA_LABEL}</span>
    </button>
  );
};
