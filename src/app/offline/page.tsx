'use client';

import { WifiOff, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Esferas de luz de fondo para el efecto iOS */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass p-10 md:p-16 rounded-[3.5rem] border-white/20 shadow-3xl bg-white/95 dark:bg-black/90 text-center relative z-10 max-w-xl w-full">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <WifiOff className="w-10 h-10 text-primary animate-pulse" />
        </div>

        <h2 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tighter leading-none">
          Sin Conexión <br /> <span className="text-primary italic">a la Red</span>
        </h2>

        <p className="text-md text-muted-foreground mb-10 font-medium leading-relaxed">
          Para gestionar tus multas y garantizar la seguridad de tus datos, necesitamos una conexión
          activa a internet.
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-16 text-lg font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95 border-none"
          >
            <RefreshCcw className="mr-2 w-5 h-5" />
            REINTENTAR CONEXIÓN
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
            <ShieldCheck size={14} />
            Desmulta v5.1.0 — Modo Offline
          </div>
        </div>
      </div>
    </div>
  );
}
