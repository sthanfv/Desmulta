'use client';

/**
 * Skeleton loader que imita la estructura de un documento de tránsito.
 * Previene el layout shift y reduce la carga cognitiva durante el pre-warming del OCR.
 */
export default function LegalSkeleton() {
  return (
    <div
      className="w-full max-w-2xl p-6 bg-zinc-950 border border-zinc-800 rounded-lg animate-pulse shadow-md"
      data-testid="legal-skeleton"
    >
      {/* Cabecera Legal */}
      <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-16 bg-zinc-800 rounded"></div> {/* Simula Escudo/Logo */}
          <div className="space-y-2">
            <div className="h-4 w-48 bg-zinc-800 rounded"></div>
            <div className="h-3 w-32 bg-zinc-800 rounded"></div>
          </div>
        </div>
        <div className="h-6 w-24 bg-red-900/20 border border-red-900/50 rounded"></div>{' '}
        {/* Simula Sello/Estado */}
      </div>

      {/* Cuerpo del Expediente */}
      <div className="space-y-4">
        <div className="h-3 w-full bg-zinc-800 rounded"></div>
        <div className="h-3 w-11/12 bg-zinc-800 rounded"></div>
        <div className="h-3 w-4/5 bg-zinc-800 rounded"></div>
      </div>

      {/* Bloque de Evidencia Fotográfica */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 bg-zinc-800 rounded-md border border-zinc-700"></div>
        <div className="space-y-3 pt-2">
          <div className="h-3 w-full bg-zinc-800 rounded"></div>
          <div className="h-3 w-full bg-zinc-800 rounded"></div>
          <div className="h-3 w-2/3 bg-zinc-800 rounded"></div>
          <div className="h-8 w-1/2 bg-zinc-800 rounded mt-4"></div> {/* Botón fantasma */}
        </div>
      </div>
    </div>
  );
}
