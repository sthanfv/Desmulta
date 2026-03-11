'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  MessageCircle,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile), {
  ssr: false,
});

import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { haptics } from '@/lib/utils/haptics';
import { ImageUpload } from './ImageUpload';

type ConsultationFormData = z.infer<typeof ConsultationSchema>;
const FIELD_LABELS: Record<string, string> = {
  cedula: 'Cédula',
  placa: 'Placa',
  nombre: 'Nombre',
  contacto: 'WhatsApp/Celular',
  aceptoTerminos: 'Términos y Condiciones',
  antiguedad: 'Antigüedad',
  tipoInfraccion: 'Tipo de Infracción',
  estadoCoactivo: 'Estado Coactivo',
  evidenceUrl: 'Captura de pantalla',
  email: 'Correo electrónico',
};

// --- ARMA DE CONVERSIÓN TÁCTICA: ENRUTADOR MÁGICO ---
// Lee parámetros de WhatsApp/Ads en la URL y auto-rellena el estado sin interactuar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnrutadorMagico({ form }: { form: UseFormReturn<any> }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const placaURL = searchParams.get('placa');
    const ciudadURL = searchParams.get('ciudad');

    if (placaURL) {
      form.setValue('placa', placaURL.toUpperCase(), { shouldValidate: true });
    }

    if (ciudadURL) {
      form.setValue('ciudad', ciudadURL, { shouldValidate: true });
    }
  }, [searchParams, form]);

  return null;
}

interface ConsultationFormProps {
  onSuccess: () => void;
  mode?: 'full' | 'simit';
}

export function ConsultationForm({ onSuccess, mode = 'full' }: ConsultationFormProps) {
  const isSimitMode = mode === 'simit';
  const [step, setStep] = useState(isSimitMode ? 2 : 0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCedula, setShowCedula] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInteraction = () => {
    if (!isHuman) setIsHuman(true);
  };

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(
      isSimitMode
        ? (SimitCaptureSchema as unknown as typeof ConsultationSchema)
        : ConsultationSchema
    ),
    defaultValues: isSimitMode
      ? {
          contacto: '',
          aceptoTerminos: false,
          _tramp_field: '',
          evidenceUrl: '',
          cedula: 'SIMIT-CAPTURA',
          placa: '',
          nombre: 'VÍA CAPTURA SIMIT',
          antiguedad: 'N/A',
          tipoInfraccion: 'N/A',
          estadoCoactivo: 'N/A',
        }
      : {
          cedula: '',
          placa: '',
          nombre: '',
          contacto: '',
          aceptoTerminos: false,
          _tramp_field: '',
          antiguedad: '',
          tipoInfraccion: '',
          estadoCoactivo: '',
          evidenceUrl: '',
          email: '',
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

    const subscription = form.watch((value: Partial<ConsultationFormData>) => {
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
    // Permitimos hasta 6 caracteres para carros (AAA123) y motos (AAA12A)
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
    try {
      if (!turnstileToken) {
        haptics.vibrate('warning');
        throw new Error('Nuestro escudo de protección está terminando de activarse. Por favor, espera un segundo más para mayor seguridad.');
      }

      toast({
        title: '¡Recibiendo tus datos!',
        description: 'Estamos preparando todo con cuidado, por favor mantén esta ventana abierta.',
      });

      const auth = getAuth();
      let currentUser = auth.currentUser;

      if (!currentUser) {
        // Reducimos la espera al mínimo para asegurar la sesión anónima
        await new Promise((resolve) => setTimeout(resolve, 300));
        currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Estamos estableciendo una conexión segura. Por favor, pulsa el botón de nuevo.');
        }
      }

      const payload = {
        ...data,
        turnstileToken,
        authorUid: currentUser.uid,
        ...(isSimitMode && { fuente: 'simit_capture' }),
      };

      // --- VALIDACIÓN EN EL EDGE (solo flujo completo, no para capturas SIMIT) ---
      // El modo SIMIT usa cedula='SIMIT-CAPTURA' (no numérica), que fallaría el validador.
      if (!isSimitMode) {
        const edgeValidation = await fetch('/api/validar-consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placa: data.placa, cedula: data.cedula, turnstileToken }),
        });

        if (!edgeValidation.ok) {
          const edgeError = await edgeValidation.json();
          throw new Error(edgeError.error || 'Fallo en la validación preliminar.');
        }
      }
      // -------------------------------------------------------

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
          'Recibimos tu información con éxito. Muy pronto uno de nuestros asesores procesará tu estudio de viabilidad técnica y te contactará.',
        duration: 8000,
      });
      haptics.vibrate('success');
      setIsSuccess(true);
      localStorage.removeItem('consultation_draft');
      // Cerramos automáticamente tras un breve periodo de éxito
      setTimeout(onSuccess, 3000);
    } catch (e: unknown) {
      haptics.vibrate('error');
      const message = e instanceof Error ? e.message : 'Tuvimos un pequeño inconveniente. Por favor, intenta de nuevo más tarde.';
      toast({
        variant: 'destructive',
        title: 'Revisa estos detalles',
        description: message,
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center min-h-[450px] md:h-[500px] animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-8 shadow-Inner border border-green-500/20">
          <CheckCircle2 className="w-14 h-14" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-4 text-foreground tracking-tight uppercase">
          Certificación en Trámite
        </h3>
        <p className="text-muted-foreground text-lg max-w-sm leading-relaxed font-medium">
          Su caso está siendo procesado por nuestro{' '}
          <strong>equipo de analistas especializados</strong>. Un asesor especializado le contactará
          en su WhatsApp{' '}
          <span className="text-primary font-bold">{form.getValues('contacto')}</span> durante
          nuestro horario de atención habitual para entregarle su estudio de viabilidad técnica.
        </p>
        <Button
          onClick={onSuccess}
          variant="outline"
          className="mt-10 rounded-2xl w-full sm:w-auto px-6 md:px-12 border-primary/20 hover:bg-primary/5 text-primary font-black active:scale-95 transition-all relative overflow-hidden h-14 uppercase tracking-widest text-xs md:text-sm"
        >
          Cerrar Notificación
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onMouseMove={handleInteraction}
        onKeyDown={handleInteraction}
        onTouchStart={handleInteraction}
        onSubmit={form.handleSubmit(
          async (data) => {
            await onSubmit(data);
          },
          (errors) => {
            haptics.vibrate('error');

            const errorKeys = Object.keys(errors);
            const firstFieldName = errorKeys[0];
            const firstError = errors[firstFieldName as keyof typeof errors];
            const label =
              firstFieldName in FIELD_LABELS
                ? FIELD_LABELS[firstFieldName as keyof typeof FIELD_LABELS]
                : firstFieldName;

            toast({
              variant: 'destructive',
              title: 'Formulario Incompleto',
              description: `El campo "${label}" tiene un problema: ${firstError?.message || 'Revisa el formato.'}`,
            });
          }
        )}
        className="space-y-8 md:space-y-10"
      >
        <div className="px-1">
          <Progress
            value={isSimitMode ? 100 : step === 0 ? 33 : step === 1 ? 66 : 100}
            className="h-2 bg-muted/40"
          />
        </div>

        {/* El enrutador mágico lee la URL de WhatsApp y rellena la placa */}
        <Suspense fallback={null}>
          <EnrutadorMagico form={form} />
        </Suspense>

        {/* Honeypot anti-spam (MANDATO-FILTRO v2.3.5) */}
        <div
          style={{ position: 'absolute', opacity: 0, top: -9999, left: -9999 }}
          aria-hidden="true"
        >
          <FormField
            control={form.control}
            name="_tramp_field"
            render={({ field }) => (
              <div className="hidden" aria-hidden="true">
                <input
                  {...field}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-label="Do not fill this field"
                />
              </div>
            )}
          />
        </div>

        {step === 0 && !isSimitMode && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4 text-center">
              <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                Pre-Análisis Gratuito
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-tight">
                ¿Qué tanta <span className="text-primary">probabilidad</span> <br />
                tienes de ganar?
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  id: 'Más de 3 años',
                  label: 'MÁS DE 3 AÑOS (Prescripción)',
                  desc: 'Probabilidad de Éxito: 95%',
                  color: 'text-green-500',
                  bg: 'hover:border-green-500/50',
                },
                {
                  id: 'Entre 1 y 3 años',
                  label: 'ENTRE 1 Y 3 AÑOS (Caducidad)',
                  desc: 'Probabilidad de Éxito: 75%',
                  color: 'text-yellow-500',
                  bg: 'hover:border-yellow-500/50',
                },
                {
                  id: 'Menos de 1 año',
                  label: 'MENOS DE 1 AÑO (Reciente)',
                  desc: 'Probabilidad de Éxito: 45%',
                  color: 'text-red-500',
                  bg: 'hover:border-red-500/50',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    form.setValue('antiguedad', opt.id);
                    haptics.vibrate('medium');
                    setStep(1);
                  }}
                  className={cn(
                    'p-6 rounded-[2rem] border-2 border-border/40 transition-all text-left flex flex-col gap-1 active:scale-95',
                    opt.bg
                  )}
                  aria-label={`Seleccionar antigüedad: ${opt.label}`}
                  aria-pressed={form.getValues('antiguedad') === opt.id}
                >
                  <span className="font-black text-sm uppercase tracking-tight">{opt.label}</span>
                  <span
                    className={cn('text-[10px] font-bold uppercase tracking-widest', opt.color)}
                  >
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center text-muted-foreground font-medium px-8 leading-relaxed">
              Basado en la Ley 769 de 2002 y Sentencias de la Corte Constitucional de Colombia.
            </p>
          </div>
        )}

        {step === 1 && !isSimitMode && (
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
              {/* Pregunta 2: Tipo de Infracción (Ahora es la 1 después del Termómetro) */}

              {/* Pregunta 2: Tipo de Infracción */}
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
                                field.onChange(option);
                                haptics.vibrate('light');
                              }}
                              className={cn(
                                'flex items-center justify-center h-14 rounded-2xl border-2 transition-all font-bold text-sm',
                                field.value === option
                                  ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10'
                                  : 'border-border/40 hover:border-border text-muted-foreground'
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

              {/* Pregunta 3: Coactivo */}
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
                              'h-12 md:h-14 rounded-xl md:rounded-2xl font-bold transition-all px-2 text-xs md:text-sm',
                              field.value === option
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'hover:border-primary/50'
                            )}
                            onClick={() => {
                              field.onChange(option);
                              haptics.vibrate('light');
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
              className="w-full bg-primary text-primary-foreground font-black py-8 rounded-3xl hover:bg-primary/95 transition-all flex items-center justify-center gap-3 h-20 text-xl shadow-xl shadow-primary/20 active:scale-95 border-none relative overflow-hidden group"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-shimmer"
              />
              CONTINUAR ANÁLISIS
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="space-y-4">
              {!isSimitMode && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-tighter"
                  aria-label="Regresar al inicio del formulario"
                >
                  ← Regresar al Inicio
                </button>
              )}
              <div className="inline-flex px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase tracking-widest text-green-500">
                {isSimitMode
                  ? 'Envío Rápido con Captura SIMIT'
                  : 'Paso 2: Datos de Validación Técnica'}
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isSimitMode ? (
                  <>
                    Sube tu captura <br />
                    <span className="text-primary">y te contactamos</span>
                  </>
                ) : (
                  <>
                    Donde enviamos <br />
                    <span className="text-primary">tu certificación?</span>
                  </>
                )}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Campos completos: solo en modo full */}
              {!isSimitMode && (
                <>
                  <FormField
                    control={form.control}
                    name="cedula"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel
                          htmlFor="cedula-input"
                          className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                        >
                          Cédula del Propietario
                        </FormLabel>
                        <div className="relative group/input">
                          <FormControl>
                            <Input
                              id="cedula-input"
                              placeholder="Ej: 1012345678"
                              className={cn(
                                'h-14 md:h-16 pl-14 pr-14 rounded-2xl md:rounded-3xl border-white/20 bg-white/50 dark:bg-black/20 focus:ring-primary/20 transition-all font-bold text-lg',
                                field.value.length >= 6 && 'border-green-500/30 bg-green-500/[0.02]'
                              )}
                              {...field}
                              type={showCedula ? 'text' : 'password'}
                              autoComplete="username"
                              onChange={(e) => field.onChange(formatCedula(e.target.value))}
                            />
                          </FormControl>
                          <User
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors"
                            size={22}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCedula(!showCedula)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                            aria-label={showCedula ? 'Ocultar cédula' : 'Mostrar cédula'}
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
                          <FormLabel
                            htmlFor="placa-input"
                            className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                          >
                            Placa <span className="opacity-40">(Opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="placa-input"
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
                          <FormLabel
                            htmlFor="whatsapp-input"
                            className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                          >
                            WhatsApp Celular
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                id="whatsapp-input"
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
                              aria-hidden="true"
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
                        <FormLabel
                          htmlFor="nombre-input"
                          className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                        >
                          Nombre Completo
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="nombre-input"
                            placeholder="Como aparece en el documento"
                            {...field}
                            className="w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium shadow-Inner"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel
                          htmlFor="email-input"
                          className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                        >
                          Correo Electrónico <span className="opacity-40">(Opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="email-input"
                            type="email"
                            placeholder="tu@correo.com"
                            {...field}
                            className="w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium shadow-Inner"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* WhatsApp: siempre visible, pero en modo SIMIT es campo principal */}
              {isSimitMode && (
                <FormField
                  control={form.control}
                  name="contacto"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                        Consulta el SIMIT
                      </h3>
                      <FormLabel
                        htmlFor="whatsapp-simit-input"
                        className="text-[10px] font-black text-foreground/70 uppercase tracking-widest pl-1"
                      >
                        WhatsApp Celular
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="whatsapp-simit-input"
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
              )}
            </div>

            <FormField
              control={form.control}
              name="evidenceUrl"
              render={({ field }) => (
                <FormItem className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                  <FormControl>
                    <ImageUpload
                      onUploadSuccess={(url) => {
                        field.onChange(url);
                        form.trigger('evidenceUrl');
                      }}
                      onClear={() => {
                        field.onChange('');
                        form.trigger('evidenceUrl');
                      }}
                      required={isSimitMode}
                      currentUrl={field.value}
                    />
                  </FormControl>
                  <FormMessage className="text-center font-bold text-xs mt-2" />
                </FormItem>
              )}
            />

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

            <div className="my-6 flex flex-col items-center justify-center min-h-[65px]">
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  options={{
                    theme: 'dark',
                    size: 'normal',
                  }}
                />
              ) : (
                <div className="text-[10px] font-bold text-destructive animate-pulse uppercase tracking-widest text-center">
                  ⚠️ Error de Configuración:
                  <br />
                  Falta NEXT_PUBLIC_TURNSTILE_SITE_KEY.
                  <br />
                  Reinicia el servidor (npm run dev).
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !turnstileToken}
              className={cn(
                'w-full font-black py-8 rounded-3xl transition-all flex items-center justify-center gap-3 h-20 text-base md:text-xl shadow-xl active:scale-95 border-none relative overflow-hidden',
                turnstileToken
                  ? 'bg-primary text-primary-foreground shadow-primary/20'
                  : 'bg-muted text-muted-foreground grayscale cursor-not-allowed opacity-50'
              )}
            >
              {turnstileToken && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-shimmer"
                />
              )}
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  PROCESANDO...
                </>
              ) : isSimitMode ? (
                'ENVIAR CAPTURA SIMIT'
              ) : (
                '¡FINALIZAR ESTUDIO GRATUITO!'
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 pt-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
                SERVICIO PROTEGIDO Y VERIFICADO
              </span>
            </div>
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
              <span>Protección Técnica con Alta Calidad Administrativa</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
