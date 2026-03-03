import { MetadataRoute } from 'next';

/**
 * Robots.txt Profesional - Desmulta v5.4.1
 *
 * MANDATO-FILTRO: SEO y Seguridad
 * 1. Acceso universal para buscadores.
 * 2. Restricción estricta de rutas administrativas y privadas.
 * 3. Declaración explícita del Sitemap XML.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/private/', '/*_next/', '/static/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
