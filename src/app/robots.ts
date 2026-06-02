import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/_next/', '/private/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
