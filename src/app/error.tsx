'use client';

import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, RefreshCcw, Loader2, Home,  Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { healPwaCache } from '@/lib/utils/pwa-heal';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isHealing, setIsHealing] = useState(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;

    // Registro de error para auditoría proactiva en consola
    console.error('CRITICAL_SYSTEM_ERROR:', error);

    // Telemetría pasiva de Crash Reporting
    try {
      fetch('/api/internal/crash-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          digest: error.digest,
          path: window.location.pathname + window.location.search,
        }),
        keepalive: true,
      }).catch(() => {
        /* Fallo silencioso */
      });
    } catch (_e) {
      // Ignorar errores del propio sistema de telemetría
    }
  }, [error]);

  /**
   * Ejecuta el protocolo completo de auto-sanación PWA.
   * Purga cachés, Service Workers, localStorage e IndexedDB,
   * luego reinicia la aplicación desde cero.
   */
  const handleHeal = async () => {
    setIsHealing(true);
    await healPwaCache();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* ADN Visual: Aurora de Error */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <div className="glass p-8 md:p-16 rounded-[3rem] border-destructive/20 shadow-3xl bg-white/5 dark:bg-black/40 text-center relative z-10 max-w-2xl w-full backdrop-blur-xl pwa-native-feel">
        <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-destructive/20">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        <h2 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tighter">
          Interrupción <span className="text-destructive uppercase">Detectada</span>
        </h2>

        <p className="text-muted-foreground mb-10 max-w-md mx-auto font-medium leading-relaxed">
          El motor de la plataforma ha experimentado un fallo inesperado. No te preocupes, tus datos
          están a salvo. Puedes reparar la aplicación o reintentar la operación.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Botón principal: Sanación completa PWA */}
          <Button
            onClick={handleHeal}
            disabled={isHealing}
            className="w-full sm:w-auto h-16 px-8 text-base font-black rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xl shadow-destructive/20 active:scale-95 transition-all border-none flex items-center gap-2 disabled:opacity-70"
          >
            {isHealing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wrench className="w-5 h-5" />
            )}
            {isHealing ? 'REPARANDO NÚCLEO...' : 'REPARAR SISTEMA Y CONTINUAR'}
          </Button>

          {/* Botón secundario: Reintento ligero sin purga */}
          <Button
            onClick={() => reset()}
            disabled={isHealing}
            variant="outline"
            className="w-full sm:w-auto h-16 px-8 text-base font-bold rounded-2xl border-border/50 hover:bg-muted/50 transition-all flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            REINTENTAR SIN LIMPIAR
          </Button>
        </div>

        {/* Enlace terciario: Volver al inicio */}
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
