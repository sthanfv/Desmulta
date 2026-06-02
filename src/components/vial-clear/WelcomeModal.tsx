import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { ShieldCheck, ArrowRight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  onAcknowledge: () => void;
}

export function WelcomeModal({ onAcknowledge }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('desmulta_welcome_time');
    const now = Date.now();
    // Reaparece si no se ha visto nunca, o si pasaron más de 5 minutos (300,000 ms)
    if (!lastSeen || now - parseInt(lastSeen) > 1000 * 60 * 5) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('desmulta_welcome_time', Date.now().toString());
    setIsOpen(false);
    setTimeout(onAcknowledge, 300);
  };

  const scrollToCalculadora = () => {
    handleClose();
    // 600ms asegura que Radix UI haya devuelto el control del scroll al body por completo
    setTimeout(() => {
      const element = document.getElementById('calculadora');
      if (element) {
        // block: 'start' ancla el inicio de la sección, evitando saltos cuando la calculadora carga
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Segundo intento para compensar el "layout shift" después de que el lazy-load termine
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 800);
      }
    }, 600);
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="uppercase text-2xl md:text-4xl leading-none block font-black tracking-tighter"
        >
          Bienvenido a <br />
          <span className="text-primary italic lowercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            desmulta
          </span>
        </m.div>
      }
      icon={
        <m.div
          initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 md:mb-8"
        >
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl backdrop-blur-sm">
            <ShieldCheck
              size={42}
              className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            />
          </div>
        </m.div>
      }
    >
      <div className="space-y-6 md:space-y-8 mt-2 text-center md:text-left">
        <p className="text-muted-foreground text-sm md:text-base font-medium leading-relaxed">
          Somos tu aliado técnico-legal. Nuestra plataforma está diseñada para ayudarte a auditar y
          defenderte de fotomultas e infracciones de tránsito de manera transparente y eficiente.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {[
            {
              icon: <Calculator className="w-5 h-5 text-emerald-500" />,
              title: 'Calculadora Legal',
              desc: 'Calcula la prescripción de tus multas según la ley actual.',
              tag: 'Nuevo',
              action: scrollToCalculadora,
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
              title: 'Defensa Blindada',
              desc: 'Procesos de exoneración respaldados por expertos legales.',
            },
          ].map((item, idx) => (
            <m.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              onClick={item.action}
              className={cn(
                'flex gap-4 items-start bg-muted/30 p-4 rounded-3xl border border-border/50 hover:bg-muted/50 transition-all duration-300 group relative overflow-hidden active:scale-[0.98]',
                item.action && 'cursor-pointer border-primary/20 bg-primary/5'
              )}
            >
              <div className="bg-background p-2.5 rounded-2xl shadow-sm border border-border/50 shrink-0 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div className="text-left space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <m.h4 className="font-bold text-foreground text-sm uppercase tracking-tight">
                    {item.title}
                  </m.h4>
                  {item.tag && (
                    <m.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-500/20"
                    >
                      {item.tag}
                    </m.span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80 leading-snug">{item.desc}</p>
              </div>
            </m.div>
          ))}
        </div>

        <div className="pt-8">
          <Button
            onClick={handleClose}
            className="w-full h-14 md:h-16 rounded-2xl bg-primary text-primary-foreground font-black active:scale-95 hover:scale-[1.02] hover:shadow-primary/40 transition-all flex items-center justify-center gap-3 text-sm md:text-base shadow-2xl shadow-primary/25 border-b-4 border-primary-foreground/20"
          >
            INICIAR MI DIAGNÓSTICO GRATUITO
            <ArrowRight size={22} />
          </Button>
          <div className="flex flex-col items-center gap-2 mt-6">
            <p className="text-[10px] md:text-xs text-muted-foreground/60 text-center px-4 font-medium max-w-xs mx-auto">
              Al continuar, activas nuestro estudio técnico-legal gratuito sin compromiso de
              permanencia.
            </p>
            <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                Seguridad Encriptada
              </span>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}
