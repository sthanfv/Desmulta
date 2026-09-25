// Resumen en texto plano para tarjetas del blog y la descripción que muestra Google.
//
// [2026-09-24] El importador usaba el fragmento de Google Noticias, que trae el resaltado de la
// búsqueda como Markdown (**multas de tránsito**) y "..." al inicio: los asteriscos se veían
// en las tarjetas y en los resultados de Google. Ahora el resumen sale del texto del propio
// artículo, sin formato, y se corta en un límite de palabra.

/** Largo recomendado para la descripción en buscadores (~155 caracteres). */
export const EXCERPT_MAX_LENGTH = 155;

/** Quita la sintaxis Markdown más común y deja texto plano en una sola línea. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)([^*_\n]+)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construye un resumen de texto plano a partir del cuerpo Markdown del artículo.
 * Quita puntos suspensivos iniciales y corta en el último espacio antes del límite.
 */
export function buildExcerpt(markdown: string, maxLength: number = EXCERPT_MAX_LENGTH): string {
  const plain = stripMarkdown(markdown).replace(/^(\.{3}|…)\s*/, '');
  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,;:.–—-]+$/,
    ''
  );
  return `${base}…`;
}
