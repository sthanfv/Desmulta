import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
const PAGE_H = 792; // A4 estándar en puntos (más compacto que 900)
const ML = 50; // margen izquierdo
const MR = 50; // margen derecho
const MT = 50; // margen superior
const MB = 50; // margen inferior
const TW = PAGE_W - ML - MR; // ancho útil de texto = 512pt

/** Elimina diacríticos — Helvetica solo soporta ASCII */
function n(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');
}

/**
 * Calcula ancho real de un string en Helvetica usando métricas estándar.
 * Más preciso que el factor fijo de 0.52.
 */
const CHAR_WIDTHS: Record<string, number> = {
  ' ': 278,
  '!': 278,
  '"': 355,
  '#': 556,
  $: 556,
  '%': 889,
  '&': 667,
  "'": 191,
  '(': 333,
  ')': 333,
  '*': 389,
  '+': 584,
  ',': 278,
  '-': 333,
  '.': 278,
  '/': 278,
  '0': 556,
  '1': 556,
  '2': 556,
  '3': 556,
  '4': 556,
  '5': 556,
  '6': 556,
  '7': 556,
  '8': 556,
  '9': 556,
  ':': 278,
  ';': 278,
  '<': 584,
  '=': 584,
  '>': 584,
  '?': 556,
  '@': 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  '[': 278,
  '\\': 278,
  ']': 278,
  '^': 469,
  _: 556,
  '`': 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
};

function strWidth(str: string, fontSize: number): number {
  const scale = fontSize / 1000;
  let w = 0;
  for (const ch of str) {
    w += (CHAR_WIDTHS[ch] ?? 556) * scale;
  }
  return w;
}

/** Word-wrap usando métricas reales de Helvetica */
function wrapText(text: string, fontSize: number, maxPt: number): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '') {
      result.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let line = '';
    let lineW = 0;
    for (const word of words) {
      const wordW = strWidth(word, fontSize);
      const spaceW = line ? strWidth(' ', fontSize) : 0;
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
  reg: Awaited<ReturnType<PDFDocument['embedFont']>>;
  bold: Awaited<ReturnType<PDFDocument['embedFont']>>;
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
  const { size = 10, bold = false, color = rgb(0, 0, 0), x = ML, gap = size + 5 } = opts;
  const font = bold ? c.bold : c.reg;
  const lines = wrapText(n(str), size, PAGE_W - x - MR);
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

/**
 * Estima cuántos puntos Y necesita un bloque de líneas.
 * Usado para decidir si crear nueva página antes de secciones grandes.
 */
function _estimateHeight(lines: string[], fontSize: number, gap: number): number {
  let total = 0;
  for (const line of lines) {
    const wrapped = wrapText(n(line), fontSize, TW);
    total += wrapped.length * gap;
  }
  return total + 10;
}

// ── Función principal ──────────────────────────────────────────────
export async function generateMandatePDF(payload: MandatePayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

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
  // Omitimos la cabecera publicitaria para que el documento se vea nativo
  c = addGap(c, 20);

  // ── TÍTULO ────────────────────────────────────────────────────────
  c = text(c, tmpl.titulo, { size: 12.5, bold: true, gap: 16 });
  c = text(c, tmpl.subtitulo, { size: 8, color: rgb(0.4, 0.4, 0.4), gap: 11 });
  c = addGap(c, 14);

  // ── CUERPO ────────────────────────────────────────────────────────
  c = textBlock(c, tmpl.cuerpo(data), { size: 10, gap: 14 });
  c = addGap(c, 10);

  if (payload.causalId) {
    const causal = CAUSALES_TRANSITO[payload.causalId as keyof typeof CAUSALES_TRANSITO];
    if (causal) {
      c = text(c, tmpl.fundamentosTitulo || 'HECHOS Y FUNDAMENTOS DE DERECHO:', {
        size: 9.5,
        bold: true,
        gap: 12,
      });
      c = text(c, causal.normativa, { size: 9.5, bold: true, gap: 12 });
      c = textBlock(c, [causal.plantilla_texto], { size: 9.5, gap: 13 });
      c = addGap(c, 10);
    }
  }

  // ── FACULTADES / SECCION 1 ────────────────────────────────────────
  c = text(c, tmpl.seccion1Titulo || 'FACULTADES:', { size: 9.5, bold: true, gap: 12 });
  c = textBlock(c, tmpl.facultades, { size: 9.5, gap: 13 });
  c = addGap(c, 8);

  // ── INDEMNIDAD / SECCION 2 ────────────────────────────────────────
  c = text(c, tmpl.seccion2Titulo || 'DECLARACION DE INDEMNIDAD:', {
    size: 9.5,
    bold: true,
    gap: 12,
  });
  const indemnidadLineas =
    typeof tmpl.indemnidad === 'function' ? tmpl.indemnidad(data) : tmpl.indemnidad;
  c = textBlock(c, indemnidadLineas, { size: 9.5, gap: 13 });

  // ── FIRMA ─────────────────────────────────────────────────────────
  // Espacio mínimo para la sección de firma completa: ~110pt
  c = addGap(c, 14);
  c = ensureSpace(c, 110);

  if (tmpl.firmaTipo === 'texto') {
    c = addGap(c, 10);
    const firmaLineas = (tmpl.firmaTexto || '').split('\n');
    firmaLineas.forEach((linea) => {
      c = text(c, linea, { size: 9.5, bold: true, gap: 14 });
    });
    c = addGap(c, 20);
  } else {
    c = text(c, 'Atentamente,', { size: 10, gap: 30 });
    c = text(c, payload.infractorName, { size: 10, bold: true, gap: 12 });
    c = text(c, `C.C. No.: ${payload.infractorId}`, { size: 10, gap: 12 });
    if (payload.citizenEmail) {
      c = text(c, `Email: ${payload.citizenEmail}`, { size: 10, gap: 12 });
    }
    c = addGap(c, 20);
  }

  // ── PROTOCOLO LEY 2213 ───────────────────────────────────────────
  // Omitido a petición del cliente para mayor limpieza

  // ── MARCA DE AGUA en TODAS las páginas ───────────────────────────
  // Omitida a petición del cliente para que no parezca publicidad

  return await doc.save();
}
