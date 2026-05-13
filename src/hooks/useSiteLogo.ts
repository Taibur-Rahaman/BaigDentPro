import { useEffect, useState } from 'react';
import {
  getCachedSiteLogoUrl,
  getDefaultSiteLogoUrl,
  loadSiteLogoUrl,
  siteLogoUpdateEventName,
} from '@/lib/siteBranding';

export function useSiteLogo(): string {
  const [siteLogo, setSiteLogo] = useState<string>(() => getCachedSiteLogoUrl() || getDefaultSiteLogoUrl());

  useEffect(() => {
    void loadSiteLogoUrl().then((url) => {
      if (url) setSiteLogo(url);
    });
    const eventName = siteLogoUpdateEventName();
    const onLogoUpdate = (evt: Event) => {
      const detail = (evt as CustomEvent<{ url?: unknown }>).detail;
      const updated = typeof detail?.url === 'string' ? detail.url.trim() : '';
      setSiteLogo(updated || getDefaultSiteLogoUrl());
    };
    window.addEventListener(eventName, onLogoUpdate as EventListener);
    return () => {
      window.removeEventListener(eventName, onLogoUpdate as EventListener);
    };
  }, []);

  return siteLogo;
}
