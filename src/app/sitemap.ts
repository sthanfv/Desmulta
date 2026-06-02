import type { MetadataRoute } from 'next';
import ciudades from '@/lib/data/ciudades.json';
import infracciones from '@/lib/data/infracciones.json';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online';

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapData: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/servicios`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/calculadora`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/multas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const cityRoutes: MetadataRoute.Sitemap = ciudades.flatMap((ciudad) => {
    // 1. Ruta base de la ciudad
    const routes: MetadataRoute.Sitemap = [
      {
        url: `${SITE_URL}/multas/${ciudad.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
    ];

    // 2. Sub-rutas por infracción en esa ciudad
    infracciones.forEach((infraccion) => {
      routes.push({
        url: `${SITE_URL}/multas/${ciudad.slug}/${infraccion.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    });

    return routes;
  });

  return [...sitemapData, ...cityRoutes];
}
