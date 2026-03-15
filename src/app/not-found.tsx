import Link from 'next/link';
import { FileSearch, Home, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fondo cinemático 404 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10">
        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-primary/20 shadow-2xl animate-bounce">
          <FileSearch className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-7xl font-black text-foreground mb-4 uppercase tracking-tighter">404</h1>

        <h2 className="text-2xl font-bold text-foreground mb-6 uppercase tracking-tight">
          Página No <span className="text-primary italic">Encontrada</span>
        </h2>

        <p className="text-muted-foreground text-lg mb-12 font-medium leading-relaxed">
          Lo sentimos, el recurso legal o la sección que buscas no está disponible en esta
          dirección. Es posible que haya sido movida a nuestra nueva base de datos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="h-16 px-10 text-lg font-black rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all w-full flex items-center gap-2">
              <Home className="w-5 h-5" />
              IR AL INICIO
            </Button>
          </Link>

          <Link href="/#contacto">
            <Button
              variant="outline"
              className="h-16 px-10 text-lg font-bold rounded-2xl border-border/50 hover:bg-muted/50 transition-all w-full"
            >
              SOPORTE TÉCNICO
            </Button>
          </Link>
        </div>

        <div className="mt-16 flex items-center justify-center gap-2 opacity-30">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            Búsqueda Segura Finalizada
          </span>
        </div>
      </div>
    </div>
  );
}
