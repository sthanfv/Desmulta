'use client';

import { ChevronRight } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { ConsultationSchema } from '@/lib/definitions';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Haptics } from '@/lib/utils/haptics';

interface StepViabilidadProps {
  form: UseFormReturn<z.infer<typeof ConsultationSchema>>;
  handleNextStep: () => void;
}

export default function StepViabilidad({ form, handleNextStep }: StepViabilidadProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-4">
        <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
          Paso 1: Análisis de Viabilidad
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
          Califica tu caso <br />
          <span className="text-primary">en 30 segundos</span>
        </h2>
      </div>

      <div className="space-y-8">
        <FormField
          control={form.control}
          name="tipoInfraccion"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                1. Tipo de Captura
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['Foto-Multa (Cámara)', 'Comparendo Físico (Agente)', 'Ambas', 'Otro'].map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          Haptics.tap();
                          field.onChange(option);
                        }}
                        className={cn(
                          'flex items-center justify-center h-14 rounded-2xl border-2 transition-all font-bold text-sm pwa-native-feel',
                          field.value === option
                            ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                            : 'border-border/40 hover:border-border text-muted-foreground',
                          form.formState.errors.tipoInfraccion &&
                            !field.value &&
                            'border-destructive text-destructive ring-1 ring-destructive'
                        )}
                        aria-label={`Seleccionar tipo de captura: ${option}`}
                        aria-pressed={field.value === option}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estadoCoactivo"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                2. ¿Tiene mandamiento de pago o embargo? (Cobro Coactivo)
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-3">
                  {['SÍ', 'NO', 'NO SÉ'].map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={field.value === option ? 'default' : 'outline'}
                      className={cn(
                        'h-12 md:h-14 rounded-xl md:rounded-2xl font-bold transition-all px-2 text-xs md:text-sm pwa-native-feel',
                        field.value === option
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                          : 'hover:border-primary/50',
                        form.formState.errors.estadoCoactivo &&
                          !field.value &&
                          'border-destructive text-destructive ring-1 ring-destructive'
                      )}
                      onClick={() => {
                        Haptics.tap();
                        field.onChange(option);
                      }}
                      aria-label={`Seleccionar opción: ${option}`}
                      aria-pressed={field.value === option}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Button
        type="button"
        onClick={handleNextStep}
        className="w-full bg-primary text-primary-foreground font-black py-8 rounded-3xl hover:bg-primary/95 transition-all flex items-center justify-center gap-3 h-20 text-xl shadow-xl shadow-primary/20 active:scale-95 border-none relative overflow-hidden group pwa-native-feel"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-shimmer"
        />
        CONTINUAR ANÁLISIS
        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
}
