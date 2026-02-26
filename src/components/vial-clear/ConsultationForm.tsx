'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Search,
  MessageCircle,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useEffect } from 'react';

import { ConsultationSchema } from '@/lib/definitions';

import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { haptics } from '@/lib/utils/haptics';

type ConsultationFormData = Zod.infer<typeof ConsultationSchema>;

interface ConsultationFormProps {
  onSuccess: () => void;
}

export function ConsultationForm({ onSuccess }: ConsultationFormProps) {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCedula, setShowCedula] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const { toast } = useToast();

  const handleInteraction = () => {
    if (!isHuman) setIsHuman(true);
  };

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(ConsultationSchema),
    defaultValues: {
      cedula: '',
      placa: '',
      nombre: '',
      contacto: '',
      aceptoTerminos: false,
      _tramp_field: '', // Honeypot field evadiendo autofill
      antiguedad: '',
      tipoInfraccion: '',
      estadoCoactivo: '',
    },
  });

  // Persistence logic (Modo Supervivencia)
  useEffect(() => {
    const savedData = localStorage.getItem('consultation_draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        form.reset({ ...form.getValues(), ...parsed, aceptoTerminos: false });
      } catch (e) {
        // En producción no queremos ruido, pero fallamos silenciosamente
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al recuperar borrador', e);
        }
      }
    }

    const subscription = form.watch((value) => {
      const { cedula, placa, nombre, contacto, antiguedad, tipoInfraccion, estadoCoactivo } = value;
      localStorage.setItem(
        'consultation_draft',
        JSON.stringify({
          cedula,
          placa: placa || '',
          nombre,
          contacto,
          antiguedad,
          tipoInfraccion,
          estadoCoactivo,
        })
      );
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
  };

  const formatCedula = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 12);
  };

  const formatPlaca = (value: string) => {
    return value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
  };

  const { isSubmitting } = form.formState;

  const handleNextStep = async () => {
    const fieldsToValidate = ['antiguedad', 'tipoInfraccion', 'estadoCoactivo'] as const;
    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      haptics.vibrate('medium');
      setStep(2);
    } else {
      toast({
        variant: 'destructive',
        title: 'Complete el análisis',
        description: 'Por favor, responda las 3 preguntas de viabilidad inicial.',
      });
    }
  };

  const onSubmit: SubmitHandler<ConsultationFormData> = async (data) => {
    haptics.vibrate('medium'); // Immediate feedback on submit
    try {
      if (!isHuman) {
        throw new Error('Error de validación anti-bot. Por favor, interactúe con el formulario.');
      }

      const auth = getAuth();
      let currentUser = auth.currentUser;

      if (!currentUser) {
        // En vez de fallar y requerir que el usuario reabra el formulario,
        // esperamos 1 segundo a que Firebase asigne el anonymous o enviamos flag fallback.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Conexión inicializada. Por favor, intente dar clic nuevamente.');
        }
      }

      const payload = {
        ...data,
        authorUid: currentUser.uid,
      };

      const response = await fetch('/api/create-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Status: ${response.status}. Error interno de red.`);
      }

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Ocurrió un error en el servidor.');
      }

      toast({
        title: '¡Análisis Iniciado!',
        description:
          'Tu caso ha pasado el filtro inicial. Un asesor jurídico revisará tu historial completo y te contactará vía WhatsApp.',
      });
      haptics.vibrate('success');
      setIsSuccess(true);
      localStorage.removeItem('consultation_draft');
      setTimeout(onSuccess, 4000);
    } catch (e: unknown) {
      haptics.vibrate('error');
      const message = e instanceof Error ? e.message : 'Por favor, intente de nuevo más tarde.';
      toast({
        variant: 'destructive',
        title: 'Error de envío',
        description: message,
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[500px] animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-8 shadow-Inner border border-green-500/20">
          <CheckCircle2 className="w-14 h-14" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-4 text-foreground tracking-tight uppercase">
          Certificación en Trámite
        </h3>
        <p className="text-muted-foreground text-lg max-w-sm leading-relaxed font-medium">
          Hemos recibido su información y el análisis preliminar de viabilidad. Un asesor se
          comunicará al WhatsApp{' '}
          <span className="text-primary font-bold">{form.getValues('contacto')}</span> para
          finalizar el proceso.
        </p>
        <Button
          onClick={onSuccess}
          variant="outline"
          className="mt-10 rounded-2xl px-12 border-primary/20 hover:bg-primary/5 text-primary font-black active:scale-95 transition-all relative overflow-hidden h-14 uppercase tracking-widest"
        >
          Cerrar Notificación
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onMouseMove={handleInteraction}
        onKeyDown={handleInteraction}
        onTouchStart={handleInteraction}
        className="space-y-8"
      >
        <div className="px-1">
          <Progress value={step === 1 ? 50 : 100} className="h-2 bg-muted/40" />
        </div>

        {/* Honeypot anti-scrapping */}
        <FormField
          control={form.control}
          name="_tramp_field"
          render={({ field }) => (
            <FormItem className="hidden" aria-hidden="true">
              <FormControl>
                <Input {...field} autoComplete="new-password" tabIndex={-1} aria-hidden="true" />
              </FormControl>
            </FormItem>
          )}
        />

        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                Paso 1: Análisis de Viabilidad
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                Califica tu caso <br />
                <span className="text-primary">en 30 segundos</span>
              </h3>
            </div>

            <div className="space-y-8">
              {/* Pregunta 1: Antigüedad */}
              <FormField
                control={form.control}
                name="antiguedad"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                      1. ¿Hace cuánto tiempo fue la infracción?
                    </FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          'Menos de 1 año',
                          'Entre 1 y 3 años',
                          'Más de 3 años',
                          'No estoy seguro',
                        ].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              field.onChange(option);
                              haptics.vibrate('light');
                            }}
                            className={cn(
                              'flex items-center justify-center h-14 rounded-2xl border-2 transition-all font-bold text-sm',
                              field.value === option
                                ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                                : 'border-border/40 hover:border-border text-muted-foreground'
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pregunta 2: Tipo de Infracción */}
              <FormField
                control={form.control}
                name="tipoInfraccion"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                      2. Tipo de Captura
                    </FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['Foto-Multa (Cámara)', 'Comparendo Físico (Agente)', 'Ambas', 'Otro'].map(
                          (option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                field.onChange(option);
                                haptics.vibrate('light');
                              }}
                              className={cn(
                                'flex items-center justify-center h-14 rounded-2xl border-2 transition-all font-bold text-sm',
                                field.value === option
                                  ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                                  : 'border-border/40 hover:border-border text-muted-foreground'
                              )}
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

              {/* Pregunta 3: Coactivo */}
              <FormField
                control={form.control}
                name="estadoCoactivo"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                      3. ¿Tiene mandamiento de pago o embargo? (Cobro Coactivo)
                    </FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-3">
                        {['SÍ', 'NO', 'NO SÉ'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              field.onChange(option);
                              haptics.vibrate('light');
                            }}
                            className={cn(
                              'flex items-center justify-center h-14 rounded-2xl border-2 transition-all font-black text-sm',
                              field.value === option
                                ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                                : 'border-border/40 hover:border-border text-muted-foreground'
                            )}
                          >
                            {option}
                          </button>
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
              className="w-full bg-primary text-primary-foreground font-black py-8 rounded-3xl hover:bg-primary/95 transition-all flex items-center justify-center gap-3 h-20 text-xl shadow-xl shadow-primary/20 active:scale-95 border-none relative overflow-hidden group animate-shimmer"
            >
              CONTINUAR ANÁLISIS
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-tighter"
              >
                ← Regresar al Paso 1
              </button>
              <div className="inline-flex px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase tracking-widest text-green-500">
                Paso 2: Datos de Validación Jurídica
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                Donde enviamos <br />
                <span className="text-primary">tu certificación?</span>
              </h3>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="cedula"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1">
                      Cédula del Propietario
                    </FormLabel>
                    <div className="relative group">
                      <FormControl>
                        <Input
                          type={showCedula ? 'text' : 'password'}
                          placeholder="Identificación sin puntos ni comas"
                          {...field}
                          onChange={(e) => field.onChange(formatCedula(e.target.value))}
                          className={cn(
                            'w-full bg-background border-border/50 rounded-2xl pl-12 pr-12 h-16 text-lg font-medium focus:ring-primary/20 focus:border-primary transition-all shadow-Inner',
                            field.value.length >= 6 && 'border-green-500/30 bg-green-500/[0.02]'
                          )}
                        />
                      </FormControl>
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={20}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCedula(!showCedula)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showCedula ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="placa"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1">
                        Placa <span className="opacity-40">(Opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: AAA123"
                          {...field}
                          onChange={(e) => field.onChange(formatPlaca(e.target.value))}
                          className="w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-black tracking-widest uppercase shadow-Inner"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contacto"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1">
                        WhatsApp Celular
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="300 123 4567"
                            {...field}
                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
                            className="w-full bg-background border-border/50 rounded-2xl pl-12 h-16 text-lg font-medium shadow-Inner"
                          />
                        </FormControl>
                        <MessageCircle
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={20}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1">
                      Nombre Completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Como aparece en el documento"
                        {...field}
                        className="w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium shadow-Inner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aceptoTerminos"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-3xl p-5 bg-muted/30 border border-border/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1 border-primary/50 w-6 h-6 rounded-lg data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-xs font-bold text-foreground">
                      Acepto el tratamiento de mis datos personales.
                    </FormLabel>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Autorizo a Desmulta a consultar mi estado en el SIMIT para fines de asesoría
                      técnica.{' '}
                      <Link href="/terminos" target="_blank" className="underline text-primary">
                        Ver Términos
                      </Link>
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground font-black py-8 rounded-3xl hover:bg-primary/95 transition-all flex items-center justify-center gap-3 h-20 text-xl shadow-xl shadow-primary/20 active:scale-95 border-none animate-shimmer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  PROCESANDO...
                </>
              ) : (
                'INICIAR ESTUDIO GRATUITO'
              )}
            </Button>
          </div>
        )}

        {/* Footer info (only on Step 2) */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-border/20">
            <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-green-500/5 border border-green-500/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">
                Conexión Cifrada SSL Finalizada
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-black opacity-40">
              <ShieldCheck size={12} className="text-primary" />
              <span>Protección Técnica con Alta Calidad Jurídica</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
