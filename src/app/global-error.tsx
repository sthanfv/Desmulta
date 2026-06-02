'use client';

import { useState } from 'react';
import { Outfit } from 'next/font/google';
import { AlertTriangle, Loader2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { healPwaCache } from '@/lib/utils/pwa-heal';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
});

// Este componente es necesario para capturar errores en el RootLayout
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isHealing, setIsHealing] = useState(false);

  /**
   * En un fallo de RootLayout, el reset() de React rara vez funciona.
   * La sanación completa (purga + reinicio) es la opción más confiable.
   */
  const handleHeal = async () => {
    setIsHealing(true);
    console.error('GLOBAL_CRITICAL_ERROR:', error);
    await healPwaCache();
  };

  return (
    <html lang="es">
      <body className={cn(outfit.className, 'antialiased bg-black text-white')}>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <div className="w-24 h-24 bg-red-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-red-600/20 shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>

            <h1 className="text-4xl font-black mb-6 uppercase tracking-tighter">
              Fallo Crítico <br /> <span className="text-red-600">de Sistema</span>
            </h1>

            <p className="text-slate-400 text-lg mb-12 font-medium leading-relaxed">
              Incluso las arquitecturas de élite pueden fallar. El proyecto ha experimentado un
              error en su núcleo principal.
            </p>

            <Button
              onClick={handleHeal}
              disabled={isHealing}
              className="h-20 px-12 text-xl font-black rounded-[2rem] bg-white text-black hover:bg-slate-200 transition-all active:scale-95 shadow-2xl flex items-center gap-3 mx-auto disabled:opacity-70"
            >
              {isHealing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Wrench className="w-6 h-6" />
              )}
              {isHealing ? 'REPARANDO ADN DEL SISTEMA...' : 'REPARAR NÚCLEO CRÍTICO'}
            </Button>

            <p className="mt-12 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Desmulta v1.0.0 — Zero-Crash Architecture (Panic Verified)
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
