'use client';

import { useEffect, useRef } from 'react';

interface WatermarkProps {
  imageUrl: string;
  caseId: string; // UUID del caso
}

/**
 * Componente que renderiza una imagen en un Canvas HTML5 inyectando
 * una marca de agua esteganográfica con el UUID del caso y el timestamp.
 */
export default function WatermarkedEvidence({ imageUrl, caseId }: WatermarkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Previene problemas de CORS al exportar el canvas
    img.src = imageUrl;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Inyección de marca de agua
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Opacidad baja
      ctx.textAlign = 'right';

      const timestamp = new Date().toISOString();
      const watermarkText = `CONFIDENCIAL - DESMULTA ZERO-PII | ID: ${caseId} | TS: ${timestamp}`;

      // Estampado en la esquina inferior derecha
      ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
    };
  }, [imageUrl, caseId]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-zinc-800 shadow-lg">
      <canvas
        ref={canvasRef}
        className="w-full h-auto cursor-crosshair"
        title="Evidencia Criptográficamente Sellada"
      />
    </div>
  );
}
