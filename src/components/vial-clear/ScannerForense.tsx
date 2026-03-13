'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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

interface ScannerForenseProps {
  imageSrc: string;
  isScanning: boolean;
  words?: OcrWord[]; // Palabras detectadas por Tesseract
  progress?: number; // 0 a 100
}

export default function ScannerForense({ imageSrc, isScanning, words = [], progress = 0 }: ScannerForenseProps) {
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-900 shadow-2xl group">
      {/* 1. La Imagen Base */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Documento SIMIT"
          className={`w-full h-auto object-contain transition-all duration-700 ${isScanning ? 'opacity-60 contrast-125' : 'opacity-100'}`}
          onLoad={(e) => {
            // Capturamos las dimensiones reales para la matemática de las cajas
            const target = e.target as HTMLImageElement;
            setImgDimensions({ width: target.naturalWidth, height: target.naturalHeight });
          }}
        />
      )}

      {/* 2. El Láser Forense (Solo visible si está escaneando) */}
      {isScanning && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-hidden">
          <div className="w-full h-1 bg-green-500 shadow-[0_0_15px_3px_rgba(34,197,94,0.6)] animate-scan relative">
            {/* Gradiente de barrido hacia arriba */}
            <div className="absolute bottom-full left-0 w-full h-32 bg-gradient-to-t from-green-500/20 to-transparent"></div>
          </div>
        </div>
      )}

      {/* 3. Las Cajas Delimitadoras (Bounding Boxes) */}
      {/* Solo se dibujan si tenemos las dimensiones de la imagen para calcular porcentajes */}
      {imgDimensions.width > 0 && words.map((word, idx) => {
        // Matemática para hacer las cajas 100% responsivas
        const left = (word.bbox.x0 / imgDimensions.width) * 100;
        const top = (word.bbox.y0 / imgDimensions.height) * 100;
        const width = ((word.bbox.x1 - word.bbox.x0) / imgDimensions.width) * 100;
        const height = ((word.bbox.y1 - word.bbox.y0) / imgDimensions.height) * 100;

        // Si la palabra es clave (ej. fechas, valores, "cobro"), la pintamos de rojo, si no, verde suave.
        const isCritical = word.text.toLowerCase().includes('cobro') || word.text.match(/\d{2,}/);

        return (
          <div
            key={idx}
            className={`absolute border-[1.5px] rounded-[2px] transition-all duration-300 z-10 ${
              isCritical ? 'border-red-500 bg-red-500/10' : 'border-green-400/50 bg-green-400/5'
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

      {/* 4. Overlay de Progreso Técnico */}
      {isScanning && (
        <div className="absolute bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-sm p-3 border-t border-slate-700 z-30 flex items-center justify-between">
          <div className="flex items-center text-green-400 text-xs font-mono">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            EXTRAYENDO VECTORES NLP...
          </div>
          <div className="text-white text-xs font-bold font-mono">
            {progress.toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}
