import { MetadataRoute } from 'next';
import ciudades from '@/lib/data/ciudades.json';

/**
 * Sitemap Profesional Dinámico - Desmulta v5.4.0
 *
 * MANDATO-FILTRO: SEO "Estado del Arte"
 * 1. URLs Canónicas y Absolutas.
 * 2. Lastmod dinámico para eficiencia de rastreo.
 * 3. Expansión Nacional: Inyecta rutas dinámicas por ciudad.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.vercel.app';
  const now = new Date();

  // Definición de rutas principales con prioridades SEO
  const staticRoutes: MetadataRoute.Sitemap = [
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

  // Generación dinámica de rutas por ciudad para SEO Local
  const cityRoutes: MetadataRoute.Sitemap = ciudades.map((ciudad) => ({
    url: `${baseUrl}/servicios/${ciudad.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...cityRoutes];
}
