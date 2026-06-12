'use client';

import { Haptics } from '@/lib/utils/haptics';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { ConsultationSchema } from '@/lib/definitions';

interface StepPreAnalisisProps {
  form: UseFormReturn<z.infer<typeof ConsultationSchema>>;
  setStep: (step: number) => void;
}

export default function StepPreAnalisis({ form, setStep }: StepPreAnalisisProps) {
  const options = [
    {
      id: 'Más de 3 años',
      label: 'MÁS DE 3 AÑOS',
      desc: 'Aplica para revisión profunda',
      color: 'text-green-500',
      bg: 'hover:border-green-500/50',
    },
    {
      id: 'Entre 1 y 3 años',
      label: 'ENTRE 1 Y 3 AÑOS',
      desc: 'Aplica para rastreo de cobro',
      color: 'text-yellow-500',
      bg: 'hover:border-yellow-500/50',
    },
    {
      id: 'Menos de 1 año',
      label: 'MENOS DE 1 AÑO',
      desc: 'Aplica para revisión inicial',
      color: 'text-primary',
      bg: 'hover:border-primary/50',
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4 text-center">
        <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
          Pre-Análisis Gratuito
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-tight">
          ¿Hace cuánto tiempo ocurrió <br />
          <span className="text-primary">la infracción?</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              form.setValue('antiguedad', opt.id);
              Haptics.tap();
              setStep(1);
            }}
            className={cn(
              'p-6 rounded-[2rem] border-2 border-border/40 transition-all text-left flex flex-col gap-1 active:scale-95 pwa-native-feel',
              opt.bg,
              form.formState.errors.antiguedad &&
                form.getValues('antiguedad') !== opt.id &&
                'border-destructive ring-1 ring-destructive'
            )}
            aria-label={`Seleccionar antigüedad: ${opt.label}`}
            aria-pressed={form.getValues('antiguedad') === opt.id}
          >
            <span className="font-black text-sm uppercase tracking-tight">{opt.label}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest', opt.color)}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-center text-muted-foreground font-medium px-8 leading-relaxed">
        Basado en la Ley 769 de 2002 y Sentencias de la Corte Constitucional de Colombia.
      </p>
    </div>
  );
}
