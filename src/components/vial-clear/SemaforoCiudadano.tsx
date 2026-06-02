import React from 'react';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ScanSearch, ShieldCheck, Activity } from 'lucide-react';
import type { LegalStatus } from '@/lib/definitions';

// Modificamos LegalStatus para aceptar CONTINGENCIA como opción adicional localmente si no está en definitions
export type SemaforoStatus = LegalStatus | 'CONTINGENCIA' | 'DESCONOCIDO';

interface SemaforoProps {
  status?: SemaforoStatus;
  dictum?: string;
  lowConfidence?: boolean;
  className?: string;
}

// 🚦 DICCIONARIO VISUAL DEL SEMÁFORO CIUDADANO (EDICIÓN PREMIUM)
const SEMAFORO_CONFIG: Record<
  string,
  {
    wrapper: string;
    text: string;
    dot: string;
    iconWrapper: string;
    icon: React.ReactNode;
    badge: string;
  }
> = {
  PRESCRITO: {
    wrapper: 'border-emerald-500/40 from-emerald-500/10 to-transparent shadow-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    iconWrapper: 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
    badge: 'VIABILIDAD ALTA • LEY 769 (PRESCRIPCIÓN)',
  },
  CADUCADO: {
    wrapper: 'border-emerald-500/40 from-emerald-500/10 to-transparent shadow-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    iconWrapper: 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
    badge: 'VIABILIDAD ALTA • LEY 769 (CADUCIDAD)',
  },
  IMPUGNABLE_C038: {
    wrapper: 'border-amber-500/40 from-amber-500/10 to-transparent shadow-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    iconWrapper: 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
    badge: 'VIABILIDAD MEDIA • SENTENCIA C-038/20',
  },
  REQUIERE_REVISION: {
    wrapper: 'border-blue-500/40 from-blue-500/10 to-transparent shadow-blue-500/20',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
    iconWrapper: 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    icon: <ScanSearch className="w-8 h-8 text-blue-500" />,
    badge: 'AUDITORÍA TÉCNICA REQUERIDA',
  },
  VIGENTE: {
    wrapper: 'border-blue-500/40 from-blue-500/10 to-transparent shadow-blue-500/20',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
    iconWrapper: 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    icon: <ScanSearch className="w-8 h-8 text-blue-500" />,
    badge: 'ANÁLISIS DE NOTIFICACIONES REQUERIDO',
  },
  DESCONOCIDO: {
    wrapper: 'border-white/10 from-white/5 to-transparent shadow-white/5',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    iconWrapper: 'bg-white/5 border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]',
    icon: <ShieldCheck className="w-8 h-8 text-slate-400" />,
    badge: 'CAPTURA PROCESADA DE FORMA SEGURA',
  },
  CONTINGENCIA: {
    wrapper: 'border-amber-500/40 from-amber-500/10 to-transparent shadow-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    iconWrapper: 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    icon: <Activity className="w-8 h-8 text-amber-500" />,
    badge: 'SISTEMAS EN MANTENIMIENTO • REVISIÓN MANUAL',
  },
};

export const SemaforoCiudadano: React.FC<SemaforoProps> = ({
  status = 'DESCONOCIDO',
  dictum,
  lowConfidence,
  className,
}) => {
  const config = SEMAFORO_CONFIG[status] || SEMAFORO_CONFIG.DESCONOCIDO;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={status}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className={cn(
          'p-5 rounded-[2rem] border-2 flex flex-col md:flex-row items-start gap-5 shadow-2xl pwa-native-feel min-h-[140px] bg-gradient-to-br relative overflow-hidden backdrop-blur-md transition-all duration-500',
          config.wrapper,
          className
        )}
      >
        {/* Glow dinámico de fondo (Reflejo diagonal) */}
        <div className="absolute -top-10 -right-10 w-40 h-40 opacity-30 rounded-full blur-3xl pointer-events-none mix-blend-screen" />

        {/* Icono con contenedor Glassmorphism */}
        <div
          className={cn(
            'shrink-0 p-3.5 rounded-2xl border backdrop-blur-xl relative z-10',
            config.iconWrapper
          )}
        >
          {config.icon}
        </div>

        {/* Textos del Dictamen */}
        <div className="flex-1 pt-1 relative z-10">
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Punto parpadeante del color del semáforo */}
            <div className={cn('w-2 h-2 rounded-full animate-pulse shadow-sm', config.dot)} />
            <h4
              className={cn(
                'font-black tracking-tighter uppercase text-[11px] md:text-xs drop-shadow-sm',
                config.text
              )}
            >
              {config.badge}
            </h4>
          </div>

          <p className="text-[13px] md:text-sm text-foreground/90 font-medium leading-relaxed">
            {dictum ||
              'Hemos recibido los datos de tu caso correctamente. Un analista revisará tu expediente a fondo para encontrar posibles oportunidades de exoneración.'}
          </p>

          {/* Tag de advertencia si la calidad de la foto fue baja */}
          {lowConfidence && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-bold text-yellow-500 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1 duration-700">
              <AlertTriangle className="w-3 h-3" />
              Lectura parcial: Revisión humana requerida
            </div>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
};
