import { MetadataRoute } from 'next';

/**
 * Sitemap Profesional Dinámico - Desmulta v5.2.0
 *
 * MANDATO-FILTRO: SEO "Estado del Arte"
 * 1. URLs Canónicas y Absolutas.
 * 2. Lastmod dinámico para eficiencia de rastreo.
 * 3. Prioridades estratégicas según valor de negocio.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.vercel.app';
  const now = new Date();

  // Definición de rutas principales con prioridades SEO
  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/servicios`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/metodologia`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
