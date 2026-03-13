'use client';

import { useState } from 'react';
import Tesseract from 'tesseract.js';
import { extraerMultasDeTexto } from '@/lib/simit-parser';
import { Multa } from '@/store/useExpedienteStore';
import type { OcrWord } from '@/components/vial-clear/ScannerForense';

/**
 * Heurística de anclaje visual basada en la UI oficial del SIMIT (Marzo 2026).
 * Usamos frases compuestas específicas del portal, no palabras genéricas.
 * Una selfie, un meme o un paisaje JAMÁS contendrán estas frases.
 * MANDATO-FILTRO: Este filtro opera en el dispositivo del usuario (costo = $0).
 */
const FRASES_CLAVE_SIMIT = [
  'estado de cuenta',
  'acuerdos de pago',
  'consulta aquí comparendos',
  'secretaria',
  'secretaría',
  'infraccion',
  'infracción',
  'cobro coactivo',
  'valor a pagar',
  'imprimir documento para pago',
];

const COINCIDENCIAS_MINIMAS = 2;

export interface ResultadoOCR {
  esValida: boolean;
  coincidencias: string[];
  textoExtraido?: string;
  multasExtraidas?: Multa[];
  palabrasDetectadas?: OcrWord[];
}

// Tipos internos para saneamiento de Tesseract (v7+)
interface TesseractWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

/**
 * Hook de Validación Zero-Waste para imágenes del SIMIT.
 * Usa el procesador del dispositivo del usuario para analizar la imagen
 * vía OCR (Tesseract.js) ANTES de hacer cualquier petición al servidor.
 *
 * Flujo: Selección → Filtro peso → OCR en cliente → Heurística → Upload (solo si válida)
 */
export const useSIMITValidator = () => {
  const [analizando, setAnalizando] = useState(false);
  const [progresoOCR, setProgresoOCR] = useState(0);
  const [errorOCR, setErrorOCR] = useState<string | null>(null);

  const validarImagenSIMIT = async (archivo: File): Promise<ResultadoOCR> => {
    setAnalizando(true);
    setErrorOCR(null);
    setProgresoOCR(0);

    try {
      // Filtro 1: Peso (FinOps — Cero peticiones al servidor)
      if (!archivo.type.startsWith('image/')) {
        throw new Error('Solo se aceptan imágenes (JPG, PNG, WEBP).');
      }
      if (archivo.size > 4 * 1024 * 1024) {
        throw new Error('La imagen pesa demasiado. Comprímela o recórtala un poco.');
      }

      // Filtro 2: OCR en el dispositivo del usuario (Costo = $0)
      const resultRaw = await Tesseract.recognize(archivo, 'spa', {
        langPath: 'https://tessdata.projectnaptha.com/4.0.0', // Servidor estable a prueba de fallos
        logger: (evento) => {
          if (evento.status === 'recognizing text') {
            const pct = Math.round(evento.progress * 100);
            setProgresoOCR(pct);
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DevSecOps - OCR]: ${evento.status} - ${pct}%`);
            }
          }
        },
      });

      // Normalizar: minúsculas y colapsar espacios múltiples
      const textoLimpio = resultRaw.data.text.toLowerCase().replace(/\s+/g, ' ');

      // Filtro 3: Heurística de anclaje — Frases infalibles de la UI del SIMIT
      const coincidencias = FRASES_CLAVE_SIMIT.filter((frase) => textoLimpio.includes(frase));

      if (coincidencias.length < COINCIDENCIAS_MINIMAS) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Seguridad] Intento de subida de imagen no-SIMIT bloqueado.');
        }
        const error =
          'La imagen no es válida. Sube una captura clara del portal SIMIT donde se vean tus multas.';
        setErrorOCR(error);
        return { esValida: false, coincidencias };
      }

      // INGENIERÍA DEFENSIVA: Extraemos palabras con tipado seguro
      const data = resultRaw.data as unknown as { words: TesseractWord[]; text: string };
      const palabrasDetectadas: OcrWord[] = (data.words || []).map((w) => ({
        text: w.text,
        bbox: w.bbox,
        confidence: w.confidence,
      }));

      return {
        esValida: true,
        coincidencias,
        textoExtraido: resultRaw.data.text,
        multasExtraidas: extraerMultasDeTexto(resultRaw.data.text),
        palabrasDetectadas,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al procesar la imagen. Intenta de nuevo.';
      setErrorOCR(mensaje);
      return { esValida: false, coincidencias: [] };
    } finally {
      setAnalizando(false);
      setProgresoOCR(0);
    }
  };

  const limpiarErrorOCR = () => setErrorOCR(null);

  return {
    validarImagenSIMIT,
    analizando,
    progresoOCR,
    errorOCR,
    limpiarErrorOCR,
  };
};
