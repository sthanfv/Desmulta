'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { triggerHaptic } from '@/lib/utils/haptics';

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
 * Analizador Digital (Ex-ScannerForense)
 * MANDATO-FILTRO: Lenguaje no técnico y visualización de alta fidelidad.
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
      const hasCritical = words.some((w) => w.text.toLowerCase().includes('cobro'));
      if (hasCritical) {
        triggerHaptic('medium'); // El "click" de realidad al encontrar peligro
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

      {/* 2. El Efecto de Análisis Digital (Láser de Escaneo Forense) */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {/* Contenedor animado que se mueve */}
          <div className="w-full h-24 absolute top-0 animate-scan-forense">
            {/* La línea brillante principal */}
            <div className="w-full h-[2px] bg-primary shadow-[0_0_15px_2px_rgba(34,197,94,0.8)]" />
            
            {/* El rastro de luz (degradado) */}
            <div className="w-full h-full bg-gradient-to-b from-primary/20 to-transparent" />
          </div>
        </div>
      )}

      {/* 3. Las Cajas de Detección (Bounding Boxes) */}
      {imgDimensions.width > 0 &&
        Array.isArray(words) &&
        words.map((word, idx) => {
          const left = (word.bbox.x0 / imgDimensions.width) * 100;
          const top = (word.bbox.y0 / imgDimensions.height) * 100;
          const width = ((word.bbox.x1 - word.bbox.x0) / imgDimensions.width) * 100;
          const height = ((word.bbox.y1 - word.bbox.y0) / imgDimensions.height) * 100;

          const isCritical = word.text.toLowerCase().includes('cobro') || word.text.match(/\d{5,}/);

          return (
            <div
              key={idx}
              className={`absolute border-[1.5px] rounded-sm transition-all duration-300 z-10 ${
                isCritical ? 'border-primary bg-primary/10' : 'border-green-400/40 bg-green-400/5'
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
            <Loader2 className="w-3.5 h-3.5 mr-3 animate-spin" />
            Buscando datos oficiales...
          </div>
          <div className="text-white text-xs font-black">{progress.toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}
