import type { MetadataRoute } from 'next';
import ciudades from '@/lib/data/ciudades.json';
import infracciones from '@/lib/data/infracciones.json';
import codigosInfraccion from '@/lib/data/codigos-infraccion.json';
import { getBlogPosts } from '@/lib/mdx';

const SITE_URL =
  process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rutas estáticas principales
  const staticRoutes: MetadataRoute.Sitemap = [
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
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/multas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Rutas del blog (dinámicas, desde los archivos .mdx)
  const posts = await getBlogPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Rutas por ciudad e infracción
  const cityRoutes: MetadataRoute.Sitemap = ciudades.flatMap((ciudad) => {
    const routes: MetadataRoute.Sitemap = [
      {
        url: `${SITE_URL}/multas/${ciudad.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/servicios/${ciudad.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.85,
      },
    ];

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

  // Rutas por código de infracción (Idea #09 - SEO)
  const codigoRoutes: MetadataRoute.Sitemap = codigosInfraccion.map((infraccion) => ({
    url: `${SITE_URL}/multas/codigo/${infraccion.codigo}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  return [...staticRoutes, ...blogRoutes, ...cityRoutes, ...codigoRoutes];
}
