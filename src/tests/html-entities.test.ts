import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from '@/lib/text/html-entities';

describe('decodeHtmlEntities (importador del blog)', () => {
  it('decodifica entidades numéricas: el caso "39tatequieto39"', () => {
    expect(decodeHtmlEntities('&#39;Tatequieto&#39; a las nuevas fotomultas')).toBe(
      "'Tatequieto' a las nuevas fotomultas"
    );
    expect(decodeHtmlEntities('jal&#xF3;n de orejas')).toBe('jalón de orejas');
  });

  it('decodifica entidades nombradas, incluidas tildes y comillas tipográficas', () => {
    expect(decodeHtmlEntities('Tr&aacute;nsito &amp; Movilidad &ldquo;hoy&rdquo;')).toBe(
      'Tránsito & Movilidad “hoy”'
    );
  });

  it('resuelve el doble escapado frecuente en feeds (&amp;#39;)', () => {
    expect(decodeHtmlEntities('&amp;#39;hola&amp;#39;')).toBe("'hola'");
  });

  it('deja intactas las entidades desconocidas o inválidas', () => {
    expect(decodeHtmlEntities('&noexiste; &#99999999;')).toBe('&noexiste; &#99999999;');
  });
});
