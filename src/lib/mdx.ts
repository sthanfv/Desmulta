import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';

/**
 * Motor de Gestión de Contenidos MDX - Desmulta v5.16.1
 * 
 * MANDATO-FILTRO: Seguridad y Performance.
 * 1. Acceso restringido al directorio /src/content/blog.
 * 2. Tipado estricto para metadatos del blog.
 * 3. Procesamiento en el servidor (RSC).
 */

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPostMeta {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    author?: string;
    tags?: string[];
}

export async function getBlogPosts(): Promise<BlogPostMeta[]> {
    if (!fs.existsSync(BLOG_DIR)) {
        return [];
    }

    const files = fs.readdirSync(BLOG_DIR);
    const posts = files
        .filter((file) => file.endsWith('.mdx'))
        .map((file) => {
            const filePath = path.join(BLOG_DIR, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data } = matter(fileContent);

            return {
                ...data,
                slug: file.replace('.mdx', ''),
            } as BlogPostMeta;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return posts;
}

export async function getBlogPostBySlug(slug: string) {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    const { content, frontmatter } = await compileMDX<BlogPostMeta>({
        source: fileContent,
        options: { parseFrontmatter: true },
    });

    return {
        content,
        meta: { ...frontmatter, slug },
    };
}
