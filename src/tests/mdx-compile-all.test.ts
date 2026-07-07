import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import fs from 'fs';
import path from 'path';
import { getBlogPostBySlug } from '@/lib/mdx';

describe('Integridad de contenido MDX del blog', () => {
  const dir = path.resolve(process.cwd(), 'src/content/blog');

  if (fs.existsSync(dir)) {
    const slugs = fs
      .readdirSync(dir)
      .filter((f: string) => f.endsWith('.mdx'))
      .map((f: string) => f.replace('.mdx', ''));

    if (slugs.length > 0) {
      it.each(slugs)('%s compila sin errores', async (slug) => {
        const post = await getBlogPostBySlug(slug);
        expect(post).not.toBeNull(); // Si compileMDX fallara, getBlogPostBySlug devuelve null (o falla y el test lo atrapa)
      });
    } else {
      it('directorio de blog vacío, omitiendo test', () => {
        expect(true).toBe(true);
      });
    }
  } else {
    it('directorio de blog no existe, omitiendo test', () => {
      expect(true).toBe(true);
    });
  }
});
