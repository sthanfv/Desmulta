import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { buildExcerpt, stripMarkdown, EXCERPT_MAX_LENGTH } from '@/lib/text/excerpt';

describe('📰 Resumen de artículos del blog', () => {
  it('quita negritas, enlaces y encabezados', () => {
    expect(stripMarkdown('## Título\n**multas de tránsito** en [Colombia](https://x.co)')).toBe(
      'Título multas de tránsito en Colombia'
    );
  });

  it('quita los puntos suspensivos iniciales del fragmento de Google Noticias', () => {
    expect(buildExcerpt('... **multas** de la vigencia')).toBe('multas de la vigencia');
  });

  it('corta en un límite de palabra y termina en "…"', () => {
    const excerpt = buildExcerpt('palabra '.repeat(60));
    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX_LENGTH + 1);
    expect(excerpt.endsWith('palabra…')).toBe(true);
  });

  it('ningún artículo publicado tiene Markdown en su resumen', () => {
    const dir = path.resolve('src/content/blog');
    const conMarkdown = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.mdx'))
      .filter((f) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- archivos del directorio fijo del blog
        const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
        return /\*\*|__|\]\(/.test(String(data.excerpt ?? ''));
      });
    expect(conMarkdown).toEqual([]);
  });
});
