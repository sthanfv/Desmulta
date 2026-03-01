import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Brillo de fondo estético */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="glass p-10 md:p-16 rounded-[3rem] border-white/10 shadow-3xl bg-white/5 dark:bg-white/[0.02] text-center relative z-10 max-w-2xl w-full">
        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <ShieldCheck className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-7xl md:text-8xl font-black text-foreground tracking-tighter mb-2">
          4<span className="text-primary">0</span>4
        </h1>

        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-4 uppercase tracking-tight">
          Infracción de Ruta
        </h2>

        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto font-medium">
          Parece que te has desviado del camino. La página que buscas no existe o ha sido reubicada
          en nuestro sistema.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center h-16 px-10 text-lg font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/30 active:scale-95 transition-all border-none"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Volver al Inicio Seguro
        </Link>
      </div>
    </div>
  );
}
