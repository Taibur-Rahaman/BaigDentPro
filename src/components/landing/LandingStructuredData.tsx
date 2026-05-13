import { useEffect } from 'react';

const SITE = 'https://baigdentpro.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'BaigDentPro',
      description:
        'Dental practice management software (DPMS) for clinics in Bangladesh — scheduling, records, billing, lab, and digital prescriptions.',
      publisher: { '@id': `${SITE}/#org` },
      inLanguage: 'en-BD',
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'BaigDentPro',
      url: SITE,
      logo: `${SITE}/logo.png`,
      sameAs: ['https://wa.me/8801601677122'],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'BaigDentPro',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '300',
        priceCurrency: 'BDT',
      },
      description:
        'Clinic management system for dental practices: appointments, patient records, dental billing software, prescription software, and operations.',
    },
  ],
};

/**
 * Injects JSON-LD once for SEO / rich results (safe removal on unmount for SPA navigation).
 */
export function LandingStructuredData(): null {
  useEffect(() => {
    const id = 'bdp-jsonld-home';
    const existing = document.getElementById(id);
    if (existing) return undefined;

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
