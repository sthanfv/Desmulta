/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * Módulo MDX — Capa de Acceso al Blog
 *
 * MANDATO-FILTRO v1.9.0: Protección contra Path Traversal (LFI) — Hallazgo H1
 * La función `sanitizarSlug` valida que el slug solo contenga caracteres seguros
 * y que la ruta resuelta permanezca dentro del directorio de blog autorizado.
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import { type BlogPostMeta } from './mdx-types';

const BLOG_DIR = path.resolve(process.cwd(), 'src/content/blog');

/**
 * Sanitiza y valida un slug de blog para prevenir ataques de Path Traversal.
 *
 * Reglas:
 * - Solo letras minúsculas, números y guiones: `^[a-z0-9-]+$`
 * - La ruta resuelta debe comenzar dentro del directorio BLOG_DIR
 * - Si el slug no es válido, lanza un error para detener la ejecución
 *
 * @param slug - El segmento de ruta recibido desde la URL
 * @returns El slug validado, sin modificaciones
 * @throws Error si el slug contiene caracteres peligrosos o apunta fuera del directorio
 */
function sanitizarSlug(slug: string): string {
  // Regla 1: Patrón estricto — solo alfanuméricos y guiones
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Slug inválido detectado: "${slug}"`);
  }

  // Regla 2: Verificar que la ruta resuelta esté dentro del directorio de blog
  const rutaResuelta = path.resolve(BLOG_DIR, `${slug}.mdx`);
  if (!rutaResuelta.startsWith(BLOG_DIR + path.sep)) {
    throw new Error(`Intento de Path Traversal bloqueado para slug: "${slug}"`);
  }

  return slug;
}

export async function getBlogPosts(): Promise<BlogPostMeta[]> {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const archivos = fs.readdirSync(BLOG_DIR);
  const articulos = archivos
    .filter((archivo) => archivo.endsWith('.mdx'))
    .map((archivo) => {
      const rutaArchivo = path.join(BLOG_DIR, archivo);
      const contenido = fs.readFileSync(rutaArchivo, 'utf8');
      const { data } = matter(contenido);

      return {
        ...data,
        slug: archivo.replace('.mdx', ''),
      } as BlogPostMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return articulos;
}

export async function getBlogPostBySlug(slug: string) {
  // Sanitización anti–Path Traversal (MANDATO-FILTRO H1)
  let slugSeguro: string;
  try {
    slugSeguro = sanitizarSlug(slug);
  } catch {
    return null;
  }

  const rutaArchivo = path.resolve(BLOG_DIR, `${slugSeguro}.mdx`);

  if (!fs.existsSync(rutaArchivo)) {
    return null;
  }

  const contenido = fs.readFileSync(rutaArchivo, 'utf8');

  const { content, frontmatter } = await compileMDX<BlogPostMeta>({
    source: contenido,
    options: { parseFrontmatter: true },
  });

  return {
    content,
    meta: { ...frontmatter, slug: slugSeguro },
  };
}
