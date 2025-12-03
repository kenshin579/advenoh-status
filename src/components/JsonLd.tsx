const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://status.advenoh.pe.kr';

export function WebApplicationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Advenoh Status',
    description: 'System Server Monitoring Service',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    url: BASE_URL,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Advenoh',
    url: 'https://advenoh.pe.kr',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
