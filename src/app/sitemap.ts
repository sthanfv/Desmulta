import { MetadataRoute } from 'next';
import ciudades from '@/lib/data/ciudades.json';
import { getBlogPosts } from '@/lib/mdx';

/**
 * Sitemap Profesional Dinámico - Desmulta v5.16.1
 *
 * MANDATO-FILTRO: SEO "Estado del Arte"
 * 1. URLs Canónicas y Absolutas.
 * 2. Lastmod dinámico para eficiencia de rastreo.
 * 3. Expansión: Inyecta rutas de ciudades y posts del blog dinámicamente.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.vercel.app';

  // Páginas estáticas principales
  const staticPages: MetadataRoute.Sitemap = [
    '',
    '/servicios',
    '/faq',
    '/metodologia',
    '/blog',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 1,
  }));

  // Páginas dinámicas de ciudades
  const cityPages: MetadataRoute.Sitemap = ciudades.map((c) => ({
    url: `${baseUrl}/servicios/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Páginas dinámicas de Blog (Inyección automática MANDATO-FILTRO)
  const blogPosts = await getBlogPosts();
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...cityPages, ...blogPages];
}
