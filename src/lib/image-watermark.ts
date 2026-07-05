/**
 * 🛡️ Motor de Marca de Agua — Servidor (Node.js / Vercel Functions)
 *
 * Estrategia: intercepta el Buffer de la imagen ANTES de subirla a Vercel Blob.
 * Aplica dos capas de protección:
 *   1. Banda de texto semitransparente en la esquina inferior (visible, disuasoria)
 *   2. Metadato EXIF "Copyright" incrustado (invisible, rastreable)
 *
 * Usa `sharp` — el procesador de imágenes estándar en producción Node.js.
 * No agrega dependencias de browser (canvas) que rompen en entornos serverless.
 *
 * Instalación requerida (una sola vez):
 *   npm install sharp
 *   npm install --save-dev @types/sharp
 *
 * @module image-watermark
 */

import sharp from 'sharp';

export interface WatermarkOptions {
  /** Texto de la línea principal (ej: "© Desmulta") */
  brand?: string;
  /** ID del caso — se incluye para trazabilidad */
  caseId?: string;
  /** Opacidad del texto 0–255. Default: 140 (~55%) */
  opacity?: number;
  /** Posición de la marca de agua. Default: 'bottom-right' */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  /** Si true, solo aplica metadatos EXIF sin marca visual. Default: false */
  metadataOnly?: boolean;
}

/**
 * Aplica marca de agua a un Buffer de imagen.
 * Devuelve un nuevo Buffer con la marca estampada, listo para subir a Blob.
 *
 * @param inputBuffer Buffer original de la imagen (PNG/JPEG/WEBP)
 * @param mimeType MIME type de la imagen ('image/jpeg' | 'image/webp' | 'image/png')
 * @param options Opciones de personalización
 * @returns Buffer procesado + metadata del resultado
 */
export async function applyWatermark(
  inputBuffer: Buffer,
  mimeType: string,
  options: WatermarkOptions = {}
): Promise<{ buffer: Buffer; format: string }> {
  const {
    brand = '© Desmulta',
    caseId,
    opacity = 140,
    position = 'bottom-right',
    metadataOnly = false,
  } = options;

  const timestamp = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const watermarkLine = caseId
    ? `${brand} · ${timestamp} · ID:${caseId.slice(0, 8)}`
    : `${brand} · ${timestamp}`;

  // ─── Leer metadatos de la imagen original ────────────────────────────────
  const image = sharp(inputBuffer);
  const meta = await image.metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 600;

  // ─── Generar overlay SVG con el texto ────────────────────────────────────
  // El SVG es la forma más portátil de renderizar texto en sharp sin fuentes externas.
  const fontSize = Math.max(14, Math.round(width * 0.018)); // escala proporcional al ancho
  const padX = Math.round(width * 0.025);
  const padY = Math.round(height * 0.025);
  const textWidth = watermarkLine.length * fontSize * 0.6; // estimación razonable
  const boxH = fontSize + 14;
  const boxW = Math.min(textWidth + 24, width * 0.7);

  // Posicionamiento
  let x = padX;
  const y = height - padY - boxH;
  if (position === 'bottom-right') x = width - boxW - padX;
  if (position === 'bottom-center') x = Math.round((width - boxW) / 2);

  // SVG del overlay
  const svgText = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${x}" y="${y}"
        width="${boxW}" height="${boxH}"
        rx="4" ry="4"
        fill="rgba(0,0,0,0.55)"
      />
      <text
        x="${x + 12}" y="${y + boxH - 5}"
        font-family="monospace"
        font-size="${fontSize}"
        fill="rgba(255,255,255,${(opacity / 255).toFixed(2)})"
        letter-spacing="0.5"
      >${escapeXml(watermarkLine)}</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgText);

  // ─── Pipeline sharp ──────────────────────────────────────────────────────
  let pipeline = sharp(inputBuffer);

  if (!metadataOnly) {
    pipeline = pipeline.composite([
      {
        input: svgBuffer,
        top: 0,
        left: 0,
      },
    ]);
  }

  // Convertir al formato adecuado manteniendo calidad alta
  let outputBuffer: Buffer;
  let format: string;

  if (mimeType === 'image/png') {
    outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    format = 'png';
  } else if (mimeType === 'image/webp') {
    outputBuffer = await pipeline.webp({ quality: 88 }).toBuffer();
    format = 'webp';
  } else {
    // JPEG por defecto
    outputBuffer = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    format = 'jpeg';
  }

  return { buffer: outputBuffer, format };
}

/**
 * Convierte un File (Web API) a Buffer de Node.js.
 * Usado en Server Actions y API Routes donde llegan objetos File del FormData.
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Construye el nombre de archivo con extensión correcta tras el procesado.
 */
export function buildWatermarkedFilename(originalName: string, format: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const extMap: Record<string, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
  };
  return `${baseName}-wm.${extMap[format] ?? 'jpg'}`;
}

// ─── Utilidad interna ────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
