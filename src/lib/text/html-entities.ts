// Decodificación de entidades HTML (sin dependencias; se usa también desde scripts/ con ts-node).
//
// [2026-09-24] El importador del blog solo reemplazaba &amp;, &quot;, &lt;, &gt; y &nbsp;. Las
// entidades numéricas (&#39; = ') llegaban crudas: el título mostraba "&#39;Tatequieto&#39;" y el
// slug quedaba "39tatequieto39".

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  iexcl: '¡',
  iquest: '¿',
};

function fromCodePoint(code: number, original: string): string {
  // Fuera de rango o sustitutos sueltos: se deja el texto original
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return original;
  }
  return String.fromCodePoint(code);
}

/**
 * Convierte entidades HTML (&#39;, &#x27;, &aacute;, &amp;…) a sus caracteres.
 * Se aplica hasta dos veces para cubrir el doble escapado frecuente en feeds (&amp;#39;).
 */
export function decodeHtmlEntities(text: string): string {
  const once = (input: string) =>
    input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const isHex = entity[1] === 'x' || entity[1] === 'X';
        return fromCodePoint(parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10), match);
      }
      return NAMED[entity] ?? NAMED[entity.toLowerCase()] ?? match;
    });
  return once(once(text));
}
