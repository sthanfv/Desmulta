'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Haptics } from '@/lib/utils/haptics';
import { isFuzzyMatch } from '@/lib/utils/string-matching';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: BoundingBox;
  confidence: number;
}

interface AnalizadorDocumentosProps {
  imageSrc: string;
  isScanning: boolean;
  words?: OcrWord[]; // Palabras detectadas por Tesseract
  progress?: number; // 0 a 100
}

/**
 * Analizador Digital — Visualización premium de escaneo OCR.
 * MANDATO-FILTRO: Lenguaje no técnico y visualización de alta fidelidad.
 *
 * 📌 GUÍA DE EDICIÓN:
 * - La animación del láser se controla desde `tailwind.config.ts` (keyframe `scan`).
 * - El láser usa `top: 0% → 100%` con `position: absolute` para recorrer
 *   toda la altura de la imagen sin importar su resolución.
 * - Los colores del láser (verde forense) se definen aquí inline.
 * - La animación es `alternate` para que suba y baje suavemente.
 */
export default function AnalizadorDocumentos({
  imageSrc,
  isScanning,
  words = [],
  progress = 0,
}: AnalizadorDocumentosProps) {
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  // ─── Feedback Sensorial (MANDATO-FILTRO) ───
  useEffect(() => {
    if (words.length > 0) {
      const hasCritical = words.some(
        (w) => isFuzzyMatch(w.text, 'cobro', 1) || isFuzzyMatch(w.text, 'coactivo', 2)
      );
      if (hasCritical) {
        Haptics.tap(); // El "click" de realidad al encontrar peligro
      }
    }
  }, [words]);

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 shadow-2xl group">
      {/* 1. La Imagen Base */}
      {imageSrc && (
        <Image
          src={imageSrc}
          alt="Vista previa documento"
          width={800}
          height={600}
          unoptimized
          className={`w-full h-auto object-contain transition-all duration-700 ${
            isScanning ? 'opacity-60 contrast-125 saturate-50' : 'opacity-100'
          }`}
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            setImgDimensions({ width: target.naturalWidth, height: target.naturalHeight });
          }}
        />
      )}

      {/* 2. Efecto Láser de Escaneo — Se superpone sobre la imagen del usuario */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-3xl">
          {/* Contenedor animado que se mueve de arriba a abajo con `top` */}
          <div className="w-full h-24 absolute left-0 animate-scan-forense">
            {/* La línea brillante principal (el láser verde) */}
            <div className="w-full h-[3px] bg-green-400 shadow-[0_0_24px_6px_rgba(74,222,128,0.9),0_0_60px_10px_rgba(74,222,128,0.3)]" />

            {/* El rastro de luz degradado que sigue al láser */}
            <div className="w-full h-full bg-gradient-to-b from-green-400/30 via-green-400/5 to-transparent backdrop-blur-[1px]" />
          </div>
        </div>
      )}

      {/* 3. Las Cajas de Detección (Bounding Boxes) — Solo las más relevantes para evitar saturar el DOM (Performance) */}
      {imgDimensions.width > 0 &&
        Array.isArray(words) &&
        words
          .filter((word) => {
            // Solo renderizamos cajas con confianza alta o que sean críticas según heurística
            const isCritical =
              isFuzzyMatch(word.text, 'cobro', 1) ||
              isFuzzyMatch(word.text, 'coactivo', 2) ||
              !!word.text.match(/\d{5,}/);
            return isCritical || word.confidence > 80;
          })
          .slice(0, 40) // Límite estricto de 40 cajas para evitar bloqueos del hilo principal
          .map((word, idx) => {
            const left = (word.bbox.x0 / imgDimensions.width) * 100;
            const top = (word.bbox.y0 / imgDimensions.height) * 100;
            const width = ((word.bbox.x1 - word.bbox.x0) / imgDimensions.width) * 100;
            const height = ((word.bbox.y1 - word.bbox.y0) / imgDimensions.height) * 100;

            const isCritical =
              isFuzzyMatch(word.text, 'cobro', 1) ||
              isFuzzyMatch(word.text, 'coactivo', 2) ||
              !!word.text.match(/\d{5,}/);

            return (
              <div
                key={`${word.text}-${idx}`}
                className={`absolute border-[1.5px] rounded-sm transition-opacity duration-300 z-10 pwa-native-feel ${
                  isCritical
                    ? 'border-green-400 bg-green-400/20 shadow-[0_0_10px_2px_rgba(74,222,128,0.3)]'
                    : 'border-green-400/20 bg-green-400/5'
                }`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              />
            );
          })}

      {/* 4. Estado de Proceso Humano */}
      {isScanning && (
        <div className="absolute bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-md p-4 border-t border-slate-700 z-30 flex items-center justify-between">
          <div className="flex items-center text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            Buscando datos oficiales...
          </div>
          <div className="text-white text-xs font-black">{progress.toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}
