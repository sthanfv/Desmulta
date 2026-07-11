import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.online';

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
