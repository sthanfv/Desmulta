'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registro de error para auditoría proactiva
    console.error('CRITICAL_SYSTEM_ERROR:', error);
  }, [error]);

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
          están a salvo. Puedes intentar recuperar la sesión o volver al inicio.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto h-16 px-8 text-base font-black rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xl shadow-destructive/20 active:scale-95 transition-all border-none flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            REINTENTAR AHORA
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full h-16 px-8 text-base font-bold rounded-2xl border-border/50 hover:bg-muted/50 transition-all flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              VOLVER AL INICIO
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-border/10">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-4">
            ¿El problema persiste? Soporte SOS:
          </p>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309'}?text=Hola, tengo un error técnico en la web de Desmulta y necesito ayuda.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-green-500 hover:text-green-400 font-bold text-sm transition-colors"
          >
            <MessageCircle size={18} />
            REPORTAR POR WHATSAPP
          </a>
        </div>
      </div>
    </div>
  );
}
