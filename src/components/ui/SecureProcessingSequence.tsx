'use client';

import { useState, useEffect } from 'react';

// 1. Definimos la interfaz estricta
interface SecureProcessingProps {
  title?: string;
  sequenceSteps: string[];
  onComplete?: () => void; // Opcional: para ejecutar algo al terminar la animación
}

/**
 * Secuencia de procesamiento simulada (Optimistic UI).
 * Arquitectura actualizada: Legal-Premium Adaptive (Glassmorphism, Geist Sans).
 * Reutilizable mediante inyección de props para diferentes flujos (OCR, Consulta, etc).
 */
export default function SecureProcessingSequence({
  title = 'Procesamiento de Seguridad',
  sequenceSteps,
  onComplete,
}: SecureProcessingProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < sequenceSteps.length) {
        const nextStep = sequenceSteps.find((_, i) => i === currentIndex);
        if (typeof nextStep === 'string') {
          setLogs((prev) => [...prev, nextStep]);
        }
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 800);

    return () => clearInterval(interval);
  }, [sequenceSteps, onComplete]);

  return (
    // Contenedor Glassmorphism Adaptativo (Claro/Oscuro)
    <div className="w-full max-w-md p-6 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl font-sans">
      {/* Cabecera de Estado */}
      <div className="flex items-center space-x-3 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
        ></div>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
      </div>

      {/* Flujo de Logs Orgánico */}
      <div className="flex flex-col space-y-3 h-48 overflow-y-auto pr-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {/* Icono de Check minimalista */}
            <svg
              className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{log}</span>
          </div>
        ))}

        {/* Indicador de carga activo */}
        {!isComplete && (
          <div className="flex items-start space-x-3">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 animate-spin mt-0.5 shrink-0"></div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 animate-pulse leading-relaxed">
              Ejecutando protocolo...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
