/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import {
  extraerMultasDeTexto,
  extraerCodigoInfraccion,
  extraerCodigosInfraccion,
} from '@/lib/simit-parser';
import { Multa } from '@/store/useExpedienteStore';
import type { OcrWord } from '@/components/vial-clear/AnalizadorDocumentos';
import { tesseractManager } from '@/lib/ocr/tesseract-worker';
import { PrescriptionEngine } from '@/lib/legal/prescription-engine';
import { OCRAnalysisResult, LegalStatus } from '@/lib/definitions';
import codigosData from '@/lib/data/codigos-infraccion.json';

/**
 * Información educativa de un código de infracción del CNT.
 * Proviene del diccionario local codigos-infraccion.json — sin llamadas a red.
 */
export interface InfoEducativa {
  /** Código CNT (ej: "C29") */
  codigo: string;
  /** Nombre descriptivo de la infracción */
  nombre: string;
  /** Categoría de gravedad y salarios mínimos diarios */
  gravedad: string;
  /** Valor aproximado de la sanción en pesos colombianos 2026 */
  sancion_cop: string;
  /** Indica si la infracción genera inmovilización del vehículo */
  inmoviliza: boolean;
  /** Contexto legal pedagógico: por qué y cuándo aplica */
  contexto_legal: string;
  /** Defensa clave resumida para la impugnación */
  defensa_clave: string;
  /** ID único de la multa inyectado dinámicamente */
  idUnicoMulta?: string;
}

/**
 * Heurística de anclaje visual (Tokens Atómicos).
 */
const TOKENS_SIMIT_FUERTES = [
  'SIMIT',
  'COMPARENDO',
  'INFRACCION',
  'COACTIVO',
  'FOTOMULTA',
  'COMPARENDOS',
  'SECRETARIA',
  'TRANSITO',
  'FEDERACION COLOMBIANA',
  'ESTADO DE CUENTA',
  'CEDULA',
  'PLACAS',
];

const TOKENS_SIMIT_DEBILES = [
  'ESTADO',
  'CUENTA',
  'MULTA',
  'ACUERDO',
  'PAGO',
  'PLACA',
  'VALOR A PAGAR',
  'IMPRIMIR',
  'HISTORIAL',
  'RESUMEN',
];

const COINCIDENCIAS_FUERTES_MINIMAS = 3;
const COINCIDENCIAS_TOTALES_MINIMAS = 6;

const OCR_TIMEOUT_MS = 65000; // 65 segundos (Debe ser mayor a los 60s de Vercel)

export interface ComparendoEstructurado {
  numeroComparendo: string | null;
  fechaInfraccion: string | null;
  placa: string | null;
  codigoInfraccion: string | null;
  descripcionInfraccion: string | null;
  valorMulta: number | null;
  nombreInfractor: string | null;
  cedulaInfractor: string | null;
  entidadEmisora: string | null;
  ciudad: string | null;
  esFotomulta: boolean;
  tieneCobroCoactivo: boolean;
  tieneMandamientoPago: boolean;
  tieneResolucionSancionatoria: boolean;
  fechaResolucion: string | null;
  estado: string | null;
  textoCompleto?: string | null;
}

export interface ResultadoOCR {
  esValida: boolean;
  coincidencias: string[];
  multasExtraidas?: Multa[];
  palabrasDetectadas?: OcrWord[];
  ocrOmitido?: boolean;
  ocrData?: OCRAnalysisResult;
  archivoOptimizado?: File;
  error?: string;
  /** Información educativa del código de infracción detectado (puede ser null si no se encontró) */
  infoEducativa?: InfoEducativa | null;
  /** Información educativa de los múltiples códigos de infracción detectados */
  infoEducativas?: InfoEducativa[] | null;
  comparendosEstructurados?: ComparendoEstructurado[] | null;
  requiresManualReview?: boolean;
}

interface TesseractWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

import { mediaLogger } from '@/lib/logger/media-logger';
import { comprimirCaptura } from '@/lib/optimizador-imagenes';

const reconocerTextoConIA = async (
  file: File,
  onProgress?: (progreso: number) => void
): Promise<{ texto: string; palabras: TesseractWord[]; comparendo?: ComparendoEstructurado[] }> => {
  onProgress?.(10);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  onProgress?.(40);

  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type,
    }),
  });

  onProgress?.(80);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al procesar OCR con IA');
  }

  const data = await response.json();
  onProgress?.(100);
  return data;
};

/**
 * Hook de Validación Zero-Waste para imágenes del SIMIT.
 */
export const useSIMITValidator = () => {
  const [analizando, setAnalizando] = useState(false);
  const [progresoOCR, setProgresoOCR] = useState(0);
  const [cargandoModelo, setCargandoModelo] = useState(false);
  const [errorOCR, setErrorOCR] = useState<string | null>(null);

  const validarImagenSIMIT = async (archivo: File): Promise<ResultadoOCR> => {
    setAnalizando(true);
    setErrorOCR(null);
    setProgresoOCR(0);
    setCargandoModelo(true);

    // 🔬 TELEMETRÍA (Fase 1: Recepción)
    mediaLogger.log('FILE', `Imagen recibida: ${archivo.name}`, {
      size: `${(archivo.size / 1024 / 1024).toFixed(2)} MB`,
      type: archivo.type,
      ...mediaLogger.getDeviceInfo(),
    });

    let archivoProcesar = archivo;

    try {
      if (!archivo.type.startsWith('image/')) {
        throw new Error('Solo se aceptan imágenes (JPG, PNG, WEBP).');
      }

      // --- OPTIMIZACIÓN DROID-FIX (v7.4.7) ---
      // Redimensionamos ANTES del OCR para evitar OOM (Out of Memory) en Android.
      // Un canvas de 1600px preserva la legibilidad de tablas densas en el SIMIT
      // a la vez que protege la memoria del navegador.
      try {
        mediaLogger.log('COMPRESSION', 'Iniciando Droid-Fix (Protección de RAM)...');
        archivoProcesar = await comprimirCaptura(archivo, 1600, 0.9);

        const ahorro = (((archivo.size - archivoProcesar.size) / archivo.size) * 100).toFixed(0);
        mediaLogger.log('COMPRESSION', 'Optimización Droid-Fix completada', {
          originalSize: `${(archivo.size / 1024 / 1024).toFixed(2)} MB`,
          optimizedSize: `${(archivoProcesar.size / 1024 / 1024).toFixed(2)} MB`,
          ahorroRAM: `${ahorro}%`,
        });
      } catch (uiError) {
        mediaLogger.log('ERROR', 'Fallo en Droid-Fix, usando original', {
          err: String(uiError),
        });
      }

      const objectUrl = URL.createObjectURL(archivoProcesar);
      let ocrTimeoutId: NodeJS.Timeout | undefined = undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        ocrTimeoutId = setTimeout(() => reject(new Error('TIMEOUT_OCR')), OCR_TIMEOUT_MS);
      });

      let resultRaw: { data: { text: string; words?: TesseractWord[]; confidence?: number } };
      let comparendosEstructurados: ComparendoEstructurado[] | null = null;
      try {
        /*
         * =========================================================================
         * [MANDATO-FILTRO: OCR DESHABILITADO EN FAVOR DE LA API GEMINI]
         * =========================================================================
         * El cliente ha solicitado que el OCR local (Tesseract) quede encapsulado
         * y desconectado, pero funcional como reserva histórica. Se ha migrado
         * 100% a la API de Gemini (flash-2.5) debido a su mayor precisión,
         * velocidad y cuota gratuita suficiente (1500 req/día vs límite de 5/sem).
         */
        const USAR_TESSERACT_LOCAL = false;

        if (!USAR_TESSERACT_LOCAL) {
          mediaLogger.log('OCR', 'Enrutando hacia API Gemini (Tesseract en reserva)...');
          setProgresoOCR(50);
          const iaData = await reconocerTextoConIA(archivoProcesar, (p) => setProgresoOCR(p));

          if (!iaData || !iaData.texto) {
            throw new Error('La API de IA no pudo extraer texto de la imagen.');
          }

          resultRaw = {
            data: {
              text: iaData.texto,
              words: iaData.palabras,
              confidence: 100,
            },
          };

          // Gemini nos devuelve un Array estructurado con todas las multas
          if (Array.isArray(iaData.comparendo)) {
            comparendosEstructurados = iaData.comparendo;
          }

          setProgresoOCR(100);
          clearTimeout(ocrTimeoutId);
        } else {
          // --- INICIO CÓDIGO TESSERACT (RESERVA) ---
          const ocrTask = async () => {
            mediaLogger.log('OCR', 'Inicializando motor Tesseract local (IA desactivada)...');
            await tesseractManager.init((m: { status: string; progress: number }) => {
              switch (m.status) {
                case 'loading tesseract core':
                  setCargandoModelo(true);
                  setProgresoOCR((prev) => Math.max(prev, 10));
                  break;
                case 'loaded tesseract core':
                  setProgresoOCR((prev) => Math.max(prev, 15));
                  break;
                case 'loading language traineddata':
                  setProgresoOCR((prev) => Math.max(prev, 25));
                  break;
                case 'loaded language traineddata':
                  setProgresoOCR((prev) => Math.max(prev, 30));
                  break;
                case 'initializing tesseract':
                  setProgresoOCR((prev) => Math.max(prev, 40));
                  break;
                case 'initialized tesseract':
                  setProgresoOCR((prev) => Math.max(prev, 45));
                  break;
                case 'recognizing text':
                  setCargandoModelo(false);
                  const progress = 45 + Math.round(m.progress * 55);
                  setProgresoOCR((prev) => Math.max(prev, progress));
                  break;
              }
            });

            mediaLogger.log('OCR', 'Iniciando escaneo de patrones...');
            return await tesseractManager.recognize(objectUrl);
          };

          resultRaw = (await Promise.race([ocrTask(), timeoutPromise])) as typeof resultRaw;

          const palabrasRaw = resultRaw.data.words || [];
          const avgConf =
            palabrasRaw.length > 0
              ? Math.round(
                  palabrasRaw.reduce((acc, w) => acc + w.confidence, 0) / palabrasRaw.length
                )
              : 0;
          mediaLogger.log('OCR', 'Escaneo local completado con éxito', {
            wordCount: palabrasRaw.length,
            avgConfidence: `${avgConf}%`,
            textLength: resultRaw.data.text.length,
          });
          // --- FIN CÓDIGO TESSERACT ---
        }
      } catch (ocrError) {
        clearTimeout(ocrTimeoutId);
        const esTimeout = ocrError instanceof Error && ocrError.message === 'TIMEOUT_OCR';
        mediaLogger.log('ERROR', esTimeout ? 'Timeout en OCR' : 'Fallo crítico en motor OCR', {
          err: String(ocrError),
        });

        if (esTimeout) {
          mediaLogger.log('OCR', 'Fail-Open activado por TIMEOUT. Delegando a backend.');
          return {
            esValida: true, // FAIL-OPEN
            coincidencias: [],
            ocrOmitido: true,
            archivoOptimizado: archivoProcesar,
            multasExtraidas: [],
            palabrasDetectadas: [],
            ocrData: {
              hasSimitFormat: true, // Bypass local format check so it goes to backend
              lowConfidence: true,
              isViable: false,
              status: 'DESCONOCIDO',
              confidenceScore: 0,
              detectedDates: [],
              technicalDictum:
                'El análisis local tomó demasiado tiempo. Tu caso será analizado directamente por nuestro servidor.',
              rawText: 'OCR_TIMEOUT',
              infractionCode: 'N/A',
            },
          };
        }
        throw ocrError;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      const rawText = resultRaw.data.text;

      // --- FAIL-OPEN ANDROID (Bug 2 Fix) ---
      // Si el texto es nulo o extremadamente corto (< 20 caracteres), asumimos
      // que el Web Worker de Tesseract falló silenciosamente (común en Android WebView).
      // Permitimos el paso "Fail-Open" para que el usuario no se bloquee.
      if (rawText.trim().length < 20) {
        mediaLogger.log(
          'OCR',
          'Fail-Open activado: Texto insuficiente para validación automática.'
        );
        return {
          esValida: true, // Dejamos pasar para revisión manual en el servidor
          coincidencias: [],
          ocrOmitido: true,
          archivoOptimizado: archivoProcesar,
          requiresManualReview: true,
          ocrData: {
            hasSimitFormat: false,
            lowConfidence: true,
            requiresManualReview: true,
            isViable: false,
            status: 'DESCONOCIDO',
            confidenceScore: 0,
            detectedDates: [],
            technicalDictum:
              'El escáner no pudo leer el texto en tu dispositivo. La imagen igual fue recibida para revisión manual.',
            rawText: rawText || 'OCR_EMPTY_OR_FAILED',
            infractionCode: 'N/A',
          },
        };
      }

      const textoNormalizado = rawText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

      const coincidenciasFuertes = TOKENS_SIMIT_FUERTES.filter((token) =>
        textoNormalizado.includes(token)
      );
      const coincidenciasDebiles = TOKENS_SIMIT_DEBILES.filter((token) =>
        textoNormalizado.includes(token)
      );
      const coincidencias = [...coincidenciasFuertes, ...coincidenciasDebiles];

      const hasSimitFormat =
        coincidenciasFuertes.length >= COINCIDENCIAS_FUERTES_MINIMAS &&
        coincidencias.length >= COINCIDENCIAS_TOTALES_MINIMAS;

      // Evaluación en el Motor Técnico
      const dateRegex = /\b(\d{2}\/\d{2}\/\d{4})\b/g;
      const detectedDates = rawText.match(dateRegex) || [];

      // Calcular confianza OCR ANTES de evaluar el motor legal
      const data = resultRaw.data as unknown as { words: TesseractWord[]; confidence: number };
      const words = data.words || [];
      let confidenceScore = data.confidence;
      if (typeof confidenceScore !== 'number' || isNaN(confidenceScore) || confidenceScore === 0) {
        confidenceScore =
          words.length > 0 ? words.reduce((acc, w) => acc + w.confidence, 0) / words.length : 100;
      }

      // Pasar confidenceScore al motor para modular dictámenes de baja calidad
      const technicalAnalysis = PrescriptionEngine.evaluate(
        rawText,
        detectedDates,
        confidenceScore
      );

      // Busca números entre 5 y 11 dígitos cerca de keywords de identidad
      // v7.18.0: Refuerzo para capturar 'Cédula:' explícitamente como pidió el usuario.
      const idMatch = rawText.match(
        /(?:IDENTIFICACI[OÓ]N|DOCUMENTO|C\.?C\.?|NIT|C[EÉ]DULA|C[EÉ]DULA:)[\s\.:-]+([0-9]{5,11})/i
      );
      const extractedId = idMatch ? idMatch[1] : undefined;

      // Busca texto en bloque cerca de keywords de nombre, limitando a letras y espacios
      const nameMatch = rawText.match(
        /(?:NOMBRE|INFRACTOR|PROPIETARIO)[\s\.:-]+([A-ZÁÉÍÓÚÑ\s]{5,45})(?=\n|\r|C\.?C\.?|DOCUMENTO|IDENTIFICACI[OÓ]N|$)/i
      );
      const extractedName = nameMatch ? nameMatch[1].trim() : undefined;

      const ocrData: OCRAnalysisResult = {
        hasSimitFormat,
        isViable: technicalAnalysis.isViable ?? false,
        status: (technicalAnalysis.status as LegalStatus) ?? 'DESCONOCIDO',
        confidenceScore,
        detectedDates: technicalAnalysis.detectedDates ?? [],
        technicalDictum: technicalAnalysis.technicalDictum ?? 'Análisis inconcluso.',
        rawText,
        infractionCode: 'N/A',
        extractedId,
        extractedName,
        // v7.6.0: propagar señal de baja confianza OCR al pipeline
        lowConfidence: technicalAnalysis.lowConfidence ?? false,
      };

      if (!hasSimitFormat) {
        mediaLogger.log('FILE', 'Imagen rechazada por falta de patrones SIMIT');
        throw new Error(
          'El archivo no parece ser una captura válida del SIMIT. Asegúrate de que incluya palabras como COMPARENDO, INFRACCIÓN o SIMIT.'
        );
      }

      const palabrasDetectadas: OcrWord[] = words.map((w) => ({
        text: w.text,
        bbox: w.bbox,
        confidence: w.confidence,
      }));

      // ── Lookup educativo (Soporte Multi-Multa Psicológico) ──────
      const infoEducativas: InfoEducativa[] = [];
      const multasSimples = extraerMultasDeTexto(rawText); // Fallback engine

      if (comparendosEstructurados && comparendosEstructurados.length > 0) {
        // Usar los datos estructurados extraídos por Gemini (sin deduplicar, queremos todas)
        comparendosEstructurados.forEach((comp: ComparendoEstructurado) => {
          if (comp.esFotomulta && comp.codigoInfraccion) {
            // Es fotomulta: buscar la tarjeta específica
            const codigoNorm = comp.codigoInfraccion.toUpperCase();
            
            const entrada = (codigosData as InfoEducativa[]).find(
              (c) => c.codigo.toUpperCase() === codigoNorm
            );
            if (entrada) {
              infoEducativas.push({
                ...entrada,
                idUnicoMulta: comp.numeroComparendo || Date.now().toString() + Math.random().toString(), // Inyectar ID para el carrusel
              });
            }
          } else {
            // Es resolución / comparendo manual (Línea gris): inyectar tarjeta genérica grave
            infoEducativas.push({
              codigo: comp.numeroComparendo || 'RESOLUCIÓN SANCIONATORIA',
              nombre:
                comp.descripcionInfraccion || 'Infracción confirmada por la autoridad de tránsito',
              gravedad: 'Muy Grave (En Cobro)',
              sancion_cop: String(comp.valorMulta || 'Desconocido'),
              inmoviliza: true, // Riesgo alto
              contexto_legal: 'Resolución de Tránsito en Firme',
              defensa_clave: 'Verificación de notificaciones y debido proceso',
              idUnicoMulta: comp.numeroComparendo || Date.now().toString(),
            });
          }
        });
      } else {
        // Fallback si la IA no devolvió el array JSON pero sí el texto
        const codigosDetectados = extraerCodigosInfraccion(rawText);
        codigosDetectados.forEach((cod) => {
          const entrada = (codigosData as InfoEducativa[]).find(
            (c) => c.codigo.toUpperCase() === cod.toUpperCase()
          );
          if (entrada) {
            infoEducativas.push(entrada);
          }
        });
      }

      return {
        esValida: true,
        coincidencias,
        multasExtraidas: multasSimples,
        palabrasDetectadas,
        archivoOptimizado: archivoProcesar,
        ocrData,
        infoEducativa: infoEducativas.length > 0 ? infoEducativas[0] : null,
        infoEducativas: infoEducativas.length > 0 ? infoEducativas : null,
        comparendosEstructurados, // Propagar array a los componentes
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al procesar la imagen.';
      mediaLogger.log('ERROR', 'Excepción capturada en Validador', { msg: mensaje });
      setErrorOCR(mensaje);

      // Para cualquier error técnico:
      return {
        esValida: false,
        coincidencias: [],
        error: mensaje,
      };
    } finally {
      setAnalizando(false);
      setProgresoOCR(0);
      setCargandoModelo(false);
    }
  };

  return {
    validarImagenSIMIT,
    analizando,
    progresoOCR,
    cargandoModelo,
    errorOCR,
    limpiarErrorOCR: () => setErrorOCR(null),
  };
};
