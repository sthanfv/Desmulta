/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useCallback } from 'react';
import {
  User,
  MessageCircle,
  EyeOff,
  Eye,
  ScanSearch,
  ShieldCheck,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import SecureProcessingSequence from '@/components/ui/SecureProcessingSequence';
import { analyzeTechnicalCase } from '@/lib/legal/triage-engine';
import { SemaforoCiudadano } from '@/components/vial-clear/SemaforoCiudadano';
import { ConsultationSchema, type OCRAnalysisResult } from '@/lib/definitions';
import { z } from 'zod';

const ImageUpload = dynamic(() => import('../ImageUpload').then((mod) => mod.ImageUpload), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[140px] rounded-[2rem] border-2 border-dashed border-primary/30 bg-primary/5 animate-pulse flex items-center justify-center"></div>
  ),
});

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile), {
  ssr: false,
});

function DevTurnstileBypass({ onSuccess }: { onSuccess: (t: string) => void }) {
  React.useEffect(() => {
    const t = setTimeout(() => onSuccess('1x00000000000000000000AA'), 500);
    return () => clearTimeout(t);
  }, [onSuccess]);
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4 w-full max-w-sm rounded-[2rem] border-2 border-dashed border-green-500/30 bg-green-500/5 transition-all">
      <div className="flex justify-center items-center gap-2 text-green-500">
        <ShieldCheck size={20} />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
          Turnstile Bypass (Local)
        </span>
      </div>
    </div>
  );
}

interface StepContactoProps {
  form: UseFormReturn<z.infer<typeof ConsultationSchema>>;
  isSimitMode: boolean;
  setStep: (step: number) => void;
  showCedula: boolean;
  setShowCedula: (show: boolean) => void;
  cfToken: string | null;
  setCfToken: (token: string | null) => void;
  setTurnstileRefreshCount: (updater: (c: number) => number) => void;
  activarEscaner: boolean;
  setActivarEscaner: (active: boolean) => void;
  isScanningOCR: boolean;
  setIsScanningOCR: (scanning: boolean) => void;
  analisisTecnico: OCRAnalysisResult | undefined;
  setAnalisisTecnico: (analisis: OCRAnalysisResult | undefined) => void;
  turnstileRefreshCount: number;
  isSubmitting: boolean;
  formatCedula: (val: string) => string;
  formatPlaca: (val: string) => string;
  formatPhone: (val: string) => string;
  nonce?: string;
  fcmToken?: string | null;
  isSystemDegraded?: boolean;
}

/**
 * StepContacto: Segundo paso del flujo de consulta.
 * Gestiona la captura de datos personales, el escaneo OCR del SIMIT
 * y la visualización del diagnóstico legal dinámico (Semáforo Ciudadano).
 */
export default function StepContacto({
  form,
  isSimitMode,
  setStep,
  showCedula,
  setShowCedula,
  cfToken,
  setCfToken,
  setTurnstileRefreshCount,
  activarEscaner,
  setActivarEscaner,
  isScanningOCR,
  setIsScanningOCR,
  analisisTecnico,
  setAnalisisTecnico,
  turnstileRefreshCount,
  isSubmitting,
  formatCedula,
  formatPlaca,
  formatPhone,
  nonce,
  fcmToken,
  isSystemDegraded = false,
}: StepContactoProps) {
  const requiresOperator = form.watch('requiresOperatorFiling') ?? false;

  // 🛡️ MANDATO-FILTRO: Handlers estables con useCallback para evitar que Turnstile
  // se destruya y remonte en cada render del formulario (bug de bucle visual).
  const handleTurnstileSuccess = useCallback(
    (token: string) => {
      setCfToken(token);
    },
    [setCfToken]
  );
  const handleTurnstileExpire = useCallback(() => {
    setCfToken(null);
    setTimeout(() => setTurnstileRefreshCount((c) => c + 1), 2000);
  }, [setCfToken, setTurnstileRefreshCount]);
  const handleTurnstileError = useCallback(() => {
    setCfToken(null);
    setTimeout(() => setTurnstileRefreshCount((c) => c + 1), 3000);
  }, [setCfToken, setTurnstileRefreshCount]);

  return (
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
          {isSimitMode ? 'Envío Rápido con Captura SIMIT' : 'Paso 2: Datos de Validación Técnica'}
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
                        aria-describedby="cedula-error"
                        placeholder="Ej: 1012345678"
                        className={cn(
                          'h-14 md:h-16 pl-14 pr-14 rounded-2xl md:rounded-3xl border-white/20 bg-white/50 dark:bg-black/20 focus:ring-primary/20 transition-all font-bold text-lg',
                          (field.value?.length || 0) >= 6 &&
                            'border-green-500/30 bg-green-500/[0.02]',
                          form.formState.errors.cedula &&
                            'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
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
                  <p className="text-[10px] text-muted-foreground pl-1">
                    Solo números. Usado exclusivamente para validar su identidad jurídica.
                  </p>
                  <div id="cedula-error">
                    {form.formState.errors.cedula && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        {form.formState.errors.cedula.message}
                      </p>
                    )}
                  </div>
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
                        aria-describedby="placa-error"
                        placeholder="Ej: AAA123"
                        {...field}
                        onChange={(e) => field.onChange(formatPlaca(e.target.value))}
                        className={cn(
                          'w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-black tracking-widest uppercase shadow-Inner',
                          form.formState.errors.placa &&
                            'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
                        )}
                      />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground pl-1">
                      Formato AAA123 o AAA12A (Opcional).
                    </p>
                    <div id="placa-error">
                      {form.formState.errors.placa && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.placa.message}
                        </p>
                      )}
                    </div>
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
                          aria-describedby="whatsapp-error"
                          type="tel"
                          placeholder="300 123 4567"
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          onBlur={(e) => {
                            field.onBlur();
                          }}
                          className={cn(
                            'w-full bg-background border-border/50 rounded-2xl pl-12 h-16 text-lg font-medium shadow-Inner',
                            form.formState.errors.contacto &&
                              'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
                          )}
                        />
                      </FormControl>
                      <MessageCircle
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={20}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-1">
                      10 dígitos. Solo lo usaremos para enviarle su diagnóstico legal, sin spam.
                    </p>
                    <div id="whatsapp-error">
                      {form.formState.errors.contacto && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.contacto.message}
                        </p>
                      )}
                    </div>
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
                      aria-describedby="nombre-error"
                      placeholder="Como aparece en el documento"
                      {...field}
                      className={cn(
                        'w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium shadow-Inner',
                        form.formState.errors.nombre &&
                          'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
                      )}
                    />
                  </FormControl>
                  <div id="nombre-error">
                    {form.formState.errors.nombre && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        {form.formState.errors.nombre.message}
                      </p>
                    )}
                  </div>
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
                    Correo Electrónico
                    {requiresOperator ? (
                      <span className="text-destructive ml-1">*</span>
                    ) : (
                      <span className="opacity-40 ml-1">(Opcional)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="email-input"
                      aria-describedby="email-error"
                      type="email"
                      placeholder="tu@correo.com"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                      }}
                      required={requiresOperator}
                      className={cn(
                        'w-full bg-background border-border/50 rounded-2xl px-6 h-16 text-lg font-medium shadow-Inner',
                        form.formState.errors.email &&
                          'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
                      )}
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground pl-1">
                    Ejemplo: usuario@correo.com {requiresOperator ? '(Requerido)' : '(Opcional)'}
                  </p>
                  <div id="email-error">
                    {form.formState.errors.email && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </FormItem>
              )}
            />
          </>
        )}

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
                      onBlur={(e) => {
                        field.onBlur();
                      }}
                      className={cn(
                        'w-full bg-background border-border/50 rounded-2xl pl-12 h-16 text-lg font-medium shadow-Inner',
                        form.formState.errors.contacto &&
                          'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-500 focus-visible:ring-red-400'
                      )}
                    />
                  </FormControl>
                  <MessageCircle
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                </div>
                {form.formState.errors.contacto && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    {form.formState.errors.contacto.message}
                  </p>
                )}
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
              {!activarEscaner ? (
                <div
                  onClick={() => setActivarEscaner(true)}
                  className="relative min-h-[140px] rounded-[2rem] border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-white/5 bg-black/20 transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActivarEscaner(true)}
                  aria-label="Activar escáner de documentos SIMIT"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                    <ScanSearch size={28} />
                  </div>
                  <p className="text-sm font-bold text-foreground">Subir Captura del SIMIT</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toca aquí para activar el escáner inteligente
                  </p>
                </div>
              ) : (
                <ImageUpload
                  onUploadSuccess={(url) => {
                    field.onChange(url);
                    form.trigger('evidenceUrl');
                  }}
                  onClear={() => {
                    field.onChange('');
                    setActivarEscaner(false);
                    setAnalisisTecnico(undefined);
                    form.trigger('evidenceUrl');
                  }}
                  onOcrStateChange={(scanning, progress, words) => {
                    setIsScanningOCR(scanning);
                    if (words.length > 0) {
                      const rawText = words.map((w) => w.text).join(' ');
                      useExpedienteStore.getState().setOcrRawText(rawText);
                    }
                  }}
                  onAnalisisTecnico={setAnalisisTecnico}
                  required={isSimitMode}
                  currentUrl={field.value}
                />
              )}
            </FormControl>
            <FormMessage className="text-center font-bold text-xs mt-2" />

            {isSystemDegraded ? (
              <SemaforoCiudadano
                status="CONTINGENCIA"
                dictum="Hemos desactivado el análisis inteligente temporalmente para asegurar que tu consulta sea procesada. Por favor sube la imagen y nuestro equipo la revisará manualmente."
                className="mt-6"
              />
            ) : (
              analisisTecnico !== undefined &&
              !isScanningOCR && (
                <SemaforoCiudadano
                  status={analisisTecnico.status}
                  dictum={analisisTecnico.technicalDictum}
                  lowConfidence={analisisTecnico.lowConfidence}
                  className="mt-6"
                />
              )
            )}
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
        {process.env.NODE_ENV === 'development' ? (
          <DevTurnstileBypass onSuccess={handleTurnstileSuccess} />
        ) : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <div className="flex justify-center my-4">
            <Turnstile
              key={`turnstile-step2-${turnstileRefreshCount}`}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={handleTurnstileSuccess}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
              options={{
                theme: 'auto',
                size: 'flexible',
                language: 'es',
              }}
              scriptOptions={{
                nonce: nonce,
              }}
            />
          </div>
        ) : (
          <div className="text-[10px] font-bold text-destructive animate-pulse uppercase tracking-widest text-center">
            ⚠️ Error de Configuración: NEXT_PUBLIC_TURNSTILE_SITE_KEY faltante.
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground bg-muted/20 py-2 px-4 rounded-full w-fit mx-auto border border-border/50">
        <Lock size={14} className="text-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Datos protegidos y encriptados • Ley 1581 (Habeas Data)
        </span>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !cfToken || (isSimitMode && !form.watch('evidenceUrl'))}
        className={cn(
          'w-full font-black py-8 rounded-3xl transition-all flex items-center justify-center gap-3 h-20 text-base md:text-xl shadow-xl active:scale-95 border-none relative overflow-hidden pwa-native-feel',
          cfToken
            ? (() => {
                const triage = analyzeTechnicalCase(useExpedienteStore.getState().ocrRawText || '');
                if (triage.priority === 'ALTA') {
                  return 'bg-red-600 hover:bg-red-700 animate-pulse text-white shadow-red-500/20';
                }
                if (triage.priority === 'MEDIA') {
                  return 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/10';
                }
                return 'bg-primary text-primary-foreground shadow-primary/20';
              })()
            : 'bg-muted text-muted-foreground grayscale cursor-not-allowed opacity-50'
        )}
      >
        {cfToken && (
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-shimmer"
          />
        )}
        {isSubmitting
          ? 'PROCESANDO...'
          : isSimitMode
            ? (() => {
                const triage = analyzeTechnicalCase(useExpedienteStore.getState().ocrRawText || '');
                return triage.priority === 'ALTA'
                  ? 'SOLICITAR DIAGNÓSTICO URGENTE'
                  : 'SOLICITAR ESTUDIO DE VIABILIDAD';
              })()
            : '¡FINALIZAR ESTUDIO GRATUITO!'}
      </Button>

      {isSubmitting && (
        <div className="mt-6 flex justify-center animate-in fade-in zoom-in-95 duration-500">
          <SecureProcessingSequence
            title={isSimitMode ? 'Análisis de Blindaje Visual' : 'Protocolo de Seguridad'}
            sequenceSteps={
              isSimitMode
                ? [
                    'Validando nitidez y autenticidad documental...',
                    'Iniciando lectura inteligente de infracciones...',
                    'Cifrando expediente bajo protocolos de alta reserva...',
                    'Preparando tu diagnóstico técnico personalizado...',
                  ]
                : [
                    'Estableciendo canal seguro con las autoridades...',
                    'Cifrando tu información para máxima privacidad...',
                    'Verificando vicios de procedimiento y términos...',
                    'Finalizando tu blindaje administrativo en milisegundos...',
                  ]
            }
          />
        </div>
      )}
    </div>
  );
}
