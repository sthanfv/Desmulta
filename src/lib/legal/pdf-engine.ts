import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import {
  DocumentType,
  CaseDataForPDF,
  DOCUMENT_TEMPLATES,
  DocumentBlock,
} from './document-templates';
import { CAUSALES_TRANSITO } from './legal-types';

export interface MandatePayload {
  infractorName: string;
  infractorId: string;
  operatorName: string;
  operatorId: string;
  ticketNumber: string;
  licensePlate: string;
  shortId: string;
  acceptedAt: string;
  citizenEmail?: string;
  citizenName?: string;
  citizenId?: string;
  caseId?: string;
  documentType?: DocumentType;
  antiguedad?: string;
  estadoCoactivo?: string;
  tipoInfraccion?: string;
  causalId?: string;
}

// ── Constantes de layout ───────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792; // Carta (US Letter) estándar en puntos (8.5 x 11 pulgadas)
const ML = 50; // margen izquierdo
const MR = 50; // margen derecho
const MT = 50; // margen superior
const MB = 50; // margen inferior

/** Sanitiza el texto para pdf-lib (WinAnsiEncoding) preservando acentos y eñes.
 * Reemplaza caracteres no soportados por sus equivalentes ASCII. */
function n(text: string): string {
  if (!text) return '';
  return (
    text
      .replace(/—/g, '-')
      .replace(/–/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/•/g, '-')
      // Elimina cualquier caracter que no esté en la tabla WinAnsi
      .replace(/[^\x00-\xFF]/g, '')
  );
}

/** Word-wrap de ultra alta precisión usando el motor nativo de pdf-lib */
function wrapText(text: string, fontSize: number, maxPt: number, font: PDFFont): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '') {
      result.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let line = '';
    let lineW = 0;
    const spaceW = font.widthOfTextAtSize(' ', fontSize);

    for (const word of words) {
      const wordW = font.widthOfTextAtSize(word, fontSize);
      if (line && lineW + spaceW + wordW > maxPt) {
        result.push(line);
        line = word;
        lineW = wordW;
      } else {
        line = line ? line + ' ' + word : word;
        lineW += spaceW + wordW;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

// ── Contexto de página ─────────────────────────────────────────────
interface Ctx {
  doc: PDFDocument;
  page: ReturnType<PDFDocument['addPage']>;
  y: number;
  reg: PDFFont;
  bold: PDFFont;
}

function newPage(c: Ctx): Ctx {
  return { ...c, page: c.doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MT };
}

function ensureSpace(c: Ctx, needed: number): Ctx {
  return c.y < MB + needed ? newPage(c) : c;
}

function addGap(c: Ctx, px: number): Ctx {
  const next = { ...c, y: c.y - px };
  return next.y < MB ? newPage(c) : next;
}

function _hline(c: Ctx, col = rgb(0.7, 0.7, 0.7), th = 0.5): Ctx {
  const cc = ensureSpace(c, 4);
  cc.page.drawLine({
    start: { x: ML, y: cc.y },
    end: { x: PAGE_W - MR, y: cc.y },
    thickness: th,
    color: col,
  });
  return { ...cc, y: cc.y - th - 1 };
}

function text(
  c: Ctx,
  str: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; gap?: number }
): Ctx {
  // Ajuste de tamaño base: por defecto 11pt para estándar legal
  const { size = 11, bold = false, color = rgb(0, 0, 0), x = ML, gap = size + 5 } = opts;
  const font = bold ? c.bold : c.reg;
  const lines = wrapText(n(str), size, PAGE_W - x - MR, font);
  let cc = c;
  for (const line of lines) {
    cc = ensureSpace(cc, size + 2);
    if (line !== '') cc.page.drawText(line, { x, y: cc.y, size, font, color });
    cc = { ...cc, y: cc.y - (line === '' ? gap * 0.35 : gap) };
  }
  return cc;
}

function textBlock(
  c: Ctx,
  lines: string[],
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; gap?: number }
): Ctx {
  let cc = c;
  for (const line of lines) cc = text(cc, line, opts);
  return cc;
}

// ── Función principal ──────────────────────────────────────────────
export async function generateMandatePDF(payload: MandatePayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Documento Legal ${payload.shortId}`);
  doc.setSubject(`Referencia: ${payload.shortId}`);

  // MIGRACIÓN: Usar Times Roman (estándar legal) en lugar de Helvetica
  const reg = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);

  let c: Ctx = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MT, reg, bold };

  const docType: DocumentType = payload.documentType ?? 'peticion_general';
  const tmpl: DocumentBlock = DOCUMENT_TEMPLATES[docType];

  const data: CaseDataForPDF = {
    infractorName: payload.infractorName,
    infractorId: payload.infractorId,
    licensePlate: payload.licensePlate,
    ticketNumber: payload.ticketNumber,
    antiguedad: payload.antiguedad,
    estadoCoactivo: payload.estadoCoactivo,
    tipoInfraccion: payload.tipoInfraccion,
    shortId: payload.shortId,
    citizenEmail: payload.citizenEmail,
    caseId: payload.caseId,
  };

  // ── CABECERA ──────────────────────────────────────────────────────
  c = addGap(c, 20);

  // ── TÍTULO ────────────────────────────────────────────────────────
  c = text(c, tmpl.titulo, { size: 14, bold: true, gap: 18 });
  c = text(c, tmpl.subtitulo, { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 12 });
  c = addGap(c, 14);

  // ── CUERPO ────────────────────────────────────────────────────────
  c = textBlock(c, tmpl.cuerpo(data), { size: 11, gap: 15 });
  c = addGap(c, 10);

  if (payload.causalId) {
    const causal = CAUSALES_TRANSITO[payload.causalId as keyof typeof CAUSALES_TRANSITO];
    if (causal) {
      c = text(c, tmpl.fundamentosTitulo || 'HECHOS Y FUNDAMENTOS DE DERECHO:', {
        size: 11,
        bold: true,
        gap: 13,
      });
      c = text(c, causal.normativa, { size: 11, bold: true, gap: 13 });
      c = textBlock(c, [causal.plantilla_texto], { size: 11, gap: 14 });
      c = addGap(c, 10);
    }
  }

  // ── FACULTADES / SECCION 1 ────────────────────────────────────────
  c = text(c, tmpl.seccion1Titulo || 'FACULTADES:', { size: 11, bold: true, gap: 13 });
  c = textBlock(c, tmpl.facultades, { size: 11, gap: 14 });
  c = addGap(c, 8);

  // ── INDEMNIDAD / SECCION 2 ────────────────────────────────────────
  c = text(c, tmpl.seccion2Titulo || 'DECLARACION DE INDEMNIDAD:', {
    size: 11,
    bold: true,
    gap: 13,
  });
  const indemnidadLineas =
    typeof tmpl.indemnidad === 'function' ? tmpl.indemnidad(data) : tmpl.indemnidad;
  c = textBlock(c, indemnidadLineas, { size: 11, gap: 14 });

  // ── FIRMA ─────────────────────────────────────────────────────────
  // Espacio mínimo para la sección de firma completa: ~120pt
  c = addGap(c, 14);
  c = ensureSpace(c, 120);

  if (tmpl.firmaTipo === 'texto') {
    c = addGap(c, 10);
    const firmaLineas = (tmpl.firmaTexto || '').split('\n');
    firmaLineas.forEach((linea) => {
      c = text(c, linea, { size: 11, bold: true, gap: 15 });
    });
    c = addGap(c, 20);
  } else {
    c = text(c, 'Atentamente,', { size: 11, gap: 30 });
    c = text(c, payload.infractorName, { size: 11, bold: true, gap: 14 });
    c = text(c, `C.C. No.: ${payload.infractorId}`, { size: 11, gap: 14 });
    if (payload.citizenEmail) {
      c = text(c, `Email: ${payload.citizenEmail}`, { size: 11, gap: 14 });
    }
    c = addGap(c, 20);
  }

  return await doc.save();
}
