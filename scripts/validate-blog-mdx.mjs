// Valida que los artículos del blog compilen como MDX antes de publicarlos.
// Un solo artículo con un símbolo inválido rompe el build de Vercel (las páginas del blog
// se generan en el build), así que la publicación automática lo usa como filtro.
//
// Uso: node scripts/validate-blog-mdx.mjs [archivos...]
//      Sin argumentos valida todos los .mdx de src/content/blog.
// Sale con código 1 si algún archivo falla.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';

const BLOG_DIR = path.resolve('src/content/blog');
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : fs
        .readdirSync(BLOG_DIR)
        .filter((f) => f.endsWith('.mdx'))
        .map((f) => path.join(BLOG_DIR, f));

let fallidos = 0;
for (const file of files) {
  try {
    const { content, data } = matter(fs.readFileSync(file, 'utf8'));
    if (!data.title || !data.date) throw new Error('frontmatter sin title o date');
    await serialize(content);
  } catch (error) {
    fallidos++;
    console.error(`[MDX-INVÁLIDO] ${path.basename(file)}: ${String(error.message).slice(0, 200)}`);
  }
}

console.log(`[MDX] ${files.length - fallidos}/${files.length} artículos válidos`);
process.exit(fallidos > 0 ? 1 : 0);
