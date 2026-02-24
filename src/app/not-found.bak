'use client';

import Link from 'next/link';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-primary/20">
          <ShieldAlert size={48} className="text-primary animate-pulse" />
        </div>

        <div className="space-y-4">
          <h1 className="text-7xl font-black tracking-tighter text-foreground">404</h1>
          <h2 className="text-2xl font-bold tracking-tight text-foreground/80">
            Ruta no encontrada
          </h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Parece que la página que buscas no existe o ha sido movida. No dejes que esto detenga tu
            proceso de saneamiento vial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            asChild
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 active:scale-95 transition-all border-none"
          >
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home size={20} />
              VOLVER AL INICIO
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 h-14 rounded-2xl border-border/50 hover:bg-muted font-bold active:scale-95 transition-all"
          >
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft size={18} />
              ATRÁS
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-50">
          Desmulta Colombia — Protección Legal
        </div>
      </div>
    </div>
  );
}
