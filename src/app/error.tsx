'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aquí podrías enviar el error a un servicio de monitoreo si lo tuvieras
    console.error('Error reportado:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-destructive/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="glass p-10 md:p-16 rounded-[3rem] border-white/10 shadow-3xl bg-white/5 dark:bg-white/[0.02] text-center relative z-10 max-w-2xl w-full">
        <div className="w-24 h-24 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>

        <h2 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tight">
          Falla en el Sistema
        </h2>

        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto font-medium">
          Hemos detectado una interrupción técnica inesperada. Nuestro equipo ya ha sido notificado.
        </p>

        <Button
          onClick={() => reset()}
          className="h-16 px-10 text-lg font-black rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-2xl active:scale-95 transition-all border-none"
        >
          <RefreshCcw className="mr-2 w-5 h-5" />
          Intentar Recuperar
        </Button>
      </div>
    </div>
  );
}
