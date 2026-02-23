'use client';

import { useEffect } from 'react';
import { ShieldX, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-destructive/20">
          <ShieldX size={48} className="text-destructive" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Ups, algo falló</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Hemos detectado una anomalía técnica temporal. No se preocupe, su información está
            segura.
          </p>
        </div>

        <Button
          onClick={() => reset()}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-black shadow-xl active:scale-95 transition-all border-none flex items-center justify-center gap-2"
        >
          <RefreshCcw size={20} />
          REINTENTAR CARGA
        </Button>

        <p className="text-[10px] text-muted-foreground font-mono opacity-50">
          ID Error: {error.digest || 'Internal System Warp'}
        </p>
      </div>
    </div>
  );
}
