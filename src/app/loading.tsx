import { Loader2, ShieldCheck } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Pulse */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent animate-pulse pointer-events-none" />

      <div className="relative z-10 text-center">
        {/* Spinner Cinemático */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-primary w-8 h-8 animate-pulse" />
          </div>
        </div>

        <h2 className="text-sm font-black text-foreground uppercase tracking-[0.5em] animate-in fade-in slide-in-from-bottom-2 duration-1000">
          Iniciando Sistemas
        </h2>

        <p className="mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-50">
          Desmulta v2.8.3 — Zero-Crash Active
        </p>
      </div>

      {/* Decorative skeleton bars for "app feel" */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-32 h-1 bg-muted/20 rounded-full overflow-hidden">
        <div className="h-full bg-primary/40 w-1/2 animate-shimmer" />
      </div>
    </div>
  );
}
