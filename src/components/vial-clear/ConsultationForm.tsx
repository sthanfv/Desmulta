'use client';
import { logger } from '@/lib/logger/security-logger';

import { useState, useEffect, Suspense } from 'react';
import { type SubmitHandler, type UseFormReturn, type Path } from 'react-hook-form';
import { z } from 'zod';
import { Progress } from '../ui/progress';
import { ShieldCheck, AlertTriangle, X, RefreshCw, Activity } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';

import { ConsultationSchema } from '@/lib/definitions';
import dynamic from 'next/dynamic';

import { RateLimitBanner } from '@/components/ui/RateLimitBanner';
import { Form } from '@/components/ui/form';
import { Haptics } from '@/lib/utils/haptics';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import { consolidarExpedienteEnDB } from '@/app/actions/expediente.actions';
import { encryptE2EPayload } from '@/lib/security/client-crypto';
import { saveToVault } from '@/lib/pwa/idb-vault';
import { sugerirTipoDocumento } from '@/lib/legal/document-templates';

import { PushPermissionBanner } from './PushPermissionBanner';
import { useConsultationForm } from '@/hooks/useConsultationForm';
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

function EnrutadorMagico({ form }: { form: UseFormReturn<ConsultationFormData> }) {
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
  nonce?: string;
}

const StepPreAnalisis = dynamic(() => import('./steps/StepPreAnalisis'), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse bg-muted/20 rounded-[2rem]" />,
});
const StepViabilidad = dynamic(() => import('./steps/StepViabilidad'), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse bg-muted/20 rounded-[2rem]" />,
});
const StepContacto = dynamic(() => import('./steps/StepContacto'), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse bg-muted/20 rounded-[2rem]" />,
});
const StepSuccess = dynamic(() => import('./steps/StepSuccess'), {
  ssr: false,
});

export function ConsultationForm({ onSuccess, mode = 'full', nonce }: ConsultationFormProps) {
  const {
    step,
    setStep,
    cfToken,
    setCfToken,
    analisisTecnico,
    setAnalisisTecnico,
    isScanningOCR,
    setIsScanningOCR,
    activarEscaner,
    setActivarEscaner,
    showCedula,
    setShowCedula,
    duplicateError,
    setDuplicateError,
    successData,
    setSuccessData,
    topRef,
    form,
    toast,
    rateLimitState,
    handleRateLimitResponse,
    clearRateLimit,
    isSystemDegraded,
    forceRecoverAll,
    webPush,
    isSimitMode,
  } = useConsultationForm(mode);

  const {
    requestNotificationPermission,
    mostrarBannerPushNotificacion,
    cerrarBannerPush,
    isHandlingPermission,
    fcmToken,
    mostrarBannerPush,
    estadoPermiso,
  } = webPush;

  const [hasInteractedWithPush, setHasInteractedWithPush] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [turnstileRefreshCount, setTurnstileRefreshCount] = useState(0);

  const handleForceRecover = () => {
    setIsRecovering(true);
    forceRecoverAll();
    setTimeout(() => {
      setIsRecovering(false);
      toast({
        title: 'Sistemas Reiniciados',
        description:
          'Hemos intentado restablecer la conexión con el motor de Inteligencia Artificial.',
        duration: 3000,
      });
    }, 800);
  };

  // Lógica de persistencia (Modo Supervivencia con IndexedDB)
  useEffect(() => {
    import('@/lib/pwa/idb-vault')
      .then(({ getDraftFromVault }) => getDraftFromVault())
      .then((savedData) => {
        if (savedData) {
          try {
            form.reset({
              ...form.getValues(),
              ...(savedData as Partial<ConsultationFormData>),
              aceptoTerminos: false,
            });
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              logger.error('Error al recuperar borrador', e);
            }
          }
        }
      });

    const { unsubscribe } = form.watch((value) => {
      const formValue = value as Partial<ConsultationFormData>;

      import('@/lib/pwa/idb-vault').then(({ saveDraftToVault }) => {
        saveDraftToVault({
          cedula: formValue.cedula,
          placa: formValue.placa || '',
          nombre: formValue.nombre,
          contacto: formValue.contacto,
          antiguedad: formValue.antiguedad,
          tipoInfraccion: formValue.tipoInfraccion,
          estadoCoactivo: formValue.estadoCoactivo,
        }).catch((e) => {
          if (process.env.NODE_ENV === 'development') {
            logger.error('Error al guardar borrador', e);
          }
        });
      });
    });
    return () => unsubscribe();
  }, [form]);

  // 🔔 SISTEMA DE INCENTIVO (Nudge UI por inactividad)
  useEffect(() => {
    // Si ya completó, no hacemos nada
    if (form.formState.isSubmitSuccessful || successData || step > 2) return;

    let nudgeTimeout: NodeJS.Timeout | null = null;

    // Suscribirse a cambios en el formulario
    const { unsubscribe } = form.watch((value) => {
      const hasStarted = value.contacto || value.cedula || value.nombre || value.placa;
      if (!hasStarted) return;

      // Limpiar timeout anterior
      if (nudgeTimeout) clearTimeout(nudgeTimeout);

      // Crear nuevo timeout de 15 segundos
      nudgeTimeout = setTimeout(() => {
        // Verificar nuevamente que no haya enviado y que no esté procesando OCR
        if (
          form.formState.isSubmitSuccessful ||
          successData ||
          isScanningOCR ||
          form.formState.isSubmitting
        )
          return;

        toast({
          title: '¡Estás a un paso! 🚀',
          description:
            'Termina de llenar tus datos para que nuestro equipo evalúe tus multas de forma gratuita y confidencial.',
          duration: 8000,
        });
      }, 15000);
    });

    return () => {
      unsubscribe();
      if (nudgeTimeout) clearTimeout(nudgeTimeout);
    };
  }, [form, step, successData, toast, isScanningOCR]);

  // 🔔 SISTEMA DE ABANDONO (Lead Nurturing & Operator Alert)
  // Trackear si el usuario cierra la pestaña antes de enviar
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Si el formulario ya fue enviado exitosamente, no es abandono
      if (form.formState.isSubmitSuccessful || successData) return;

      const values = form.getValues();
      const hasMeaningfulData = values.contacto || values.email || values.cedula || values.placa;

      // Solo notificar si al menos hay algo útil o están en un paso avanzado
      if (step > 0 || hasMeaningfulData) {
        const payload = JSON.stringify({
          contacto: values.contacto || undefined,
          email: values.email || undefined,
          cedula: values.cedula || undefined,
          placa: values.placa || undefined,
          step: step,
          fcmToken: fcmToken || undefined,
          accion: 'ping',
        });

        // sendBeacon es 100% confiable durante el cierre de pestaña
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/abandonment', payload);
        } else {
          fetch('/api/abandonment', { method: 'POST', body: payload, keepalive: true }).catch(
            () => {}
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, step, successData, fcmToken]);

  // ── FUNNEL TELEMETRY ──
  // Enviar un ping silencioso cada vez que el usuario cambia de paso
  useEffect(() => {
    // Si ya completó el form, no reportamos steps de "éxito" como parte del drop-off
    if (form.formState.isSubmitSuccessful || successData) return;

    const payload = JSON.stringify({
      accion: 'funnel_step',
      step: step,
      isSimitMode: isSimitMode,
    });

    // Preferir sendBeacon si está disponible para no bloquear el hilo
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/abandonment', payload);
    } else {
      fetch('/api/abandonment', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
    }
  }, [step, isSimitMode, form.formState.isSubmitSuccessful, successData]);

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
    // 🧠 REPARACIÓN v7.6.2: Solo validar los campos visibles en ESTE paso.
    // 'antiguedad' se valida en el paso 0 al hacer click.
    const fieldsToValidate = ['tipoInfraccion', 'estadoCoactivo'] as const;
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      Haptics.tap();
      setStep(2);
    } else {
      Haptics.error();
      const currentErrors = form.formState.errors;
      const firstInvalidField = fieldsToValidate.find((field) => currentErrors[field]);
      if (firstInvalidField) {
        const el = document.querySelector(`[name="${firstInvalidField}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement)?.focus();
      }
      toast({
        variant: 'destructive',
        title: 'Complete el análisis',
        description: 'Por favor, selecciona el tipo de infracción y el estado coactivo.',
      });
    }
  };

  const [isFormProcessing, setIsFormProcessing] = useState(false);

  const onSubmit: SubmitHandler<ConsultationFormData> = async (data) => {
    if (isFormProcessing) return;
    setIsFormProcessing(true);

    // 1. Barrera de ejecución
    if (!cfToken) {
      toast({
        title: 'Seguridad Pendiente',
        description: 'El escudo anti-bot está verificando tu conexión. Intenta en un segundo.',
        variant: 'destructive',
      });
      setIsFormProcessing(false);
      return;
    }

    try {
      setDuplicateError(null);
      toast({
        title: '¡Recibiendo tus datos!',
        description: 'Estamos preparando todo con cuidado, por favor mantén esta ventana abierta.',
      });

      const auth = getAuth();
      let currentUser = auth.currentUser;

      if (!currentUser) {
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        } catch (_authError) {
          throw new Error(
            'Tu navegador está bloqueando la sesión segura (posible modo incógnito estricto). Por favor, intenta desde una pestaña normal.'
          );
        }
      }

      const rawPii = {
        cedula: data.cedula,
        contacto: data.contacto,
        email: data.email || '',
        ciudad: data.ciudad || '',
      };
      const encryptedPii = await encryptE2EPayload(rawPii);

      const payload = {
        ...data,
        cedula: undefined,
        contacto: undefined,
        email: undefined,
        ciudad: undefined,
        securePayload: encryptedPii,
        cfToken: cfToken, // Texto plano para descarte Edge rápido
        authorUid: currentUser.uid,
        ...(fcmToken && { fcmToken }), // 🔔 Enviar origin token si fue restaurado de caché
        ...(isSimitMode && { fuente: 'simit_capture' }),
        // ⚡ Motor Técnico: Adjuntar dictamen heurístico si está disponible
        ...(analisisTecnico !== undefined && {
          ocrData: analisisTecnico,
        }),
      };

      const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
      };

      // --- VALIDACIÓN EN EL EDGE (solo flujo completo, no para capturas SIMIT) ---
      if (!isSimitMode) {
        const edgeValidation = await withTimeout(
          fetch('/api/validar-consulta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa: data.placa, cedula: data.cedula }),
          }),
          10000,
          'La validación preliminar tardó demasiado. Por favor, revisa tu conexión.'
        );

        let edgeResult;
        try {
          edgeResult = await edgeValidation.json();
        } catch {
          if (edgeValidation.status === 429) {
            handleRateLimitResponse(
              edgeValidation,
              'Has superado el límite de intentos. Por favor, espera.'
            );
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsFormProcessing(false);
            return;
          }
          throw new Error('Respuesta inválida del servidor al validar.');
        }

        if (!edgeValidation.ok) {
          if (edgeValidation.status === 429) {
            handleRateLimitResponse(edgeValidation, edgeResult?.message || 'Demasiadas peticiones. Intenta en unos minutos.');
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsFormProcessing(false);
            return;
          }
          setIsFormProcessing(false);
          throw new Error(edgeResult?.error || 'Fallo en la validación preliminar.');
        }

        if (edgeResult?.valido === false) {
          setDuplicateError(
            edgeResult.mensaje || 'Ya existe una consulta activa para este documento.'
          );
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setIsFormProcessing(false);
          return;
        }
      }
      // -------------------------------------------------------

      const response = await withTimeout(
        fetch('/api/create-consultation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        15000,
        'El servidor tardó demasiado en crear el expediente. Por favor, inténtalo de nuevo.'
      );

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Status: ${response.status}. Error interno de red.`);
      }

      if (!response.ok) {
        // ── 429 Rate-limit: activar banner inline con countdown ──────────────
        if (response.status === 429) {
          handleRateLimitResponse(response, result.message || 'Demasiadas peticiones. Intenta en unos minutos.');
          // Scroll suave al banner (topRef está al inicio del form)
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setIsFormProcessing(false);
          return; // El banner gestiona el estado; no lanzar toast ni throw
        }

        // ── Otros errores del servidor ────────────────────────────────────────
        let errorMsg = result.message || result.error || 'Ocurrió un error en el servidor.';
        let firstField: string | undefined;
        if (result.details?.fieldErrors) {
          firstField = Object.keys(result.details.fieldErrors)[0];
          const fieldLabel =
            firstField in FIELD_LABELS
              ? FIELD_LABELS[firstField as keyof typeof FIELD_LABELS]
              : firstField;
          const fieldError = result.details.fieldErrors[firstField]?.[0];
          errorMsg = `Campo "${fieldLabel}": ${fieldError || 'Valor inválido.'}`;

          // Sincronizar todos los errores de validación del backend con react-hook-form
          Object.keys(result.details.fieldErrors).forEach((key) => {
            const fieldMsgs = result.details.fieldErrors[key];
            if (fieldMsgs && fieldMsgs.length > 0) {
              form.setError(key as Path<ConsultationFormData>, {
                type: 'server',
                message: fieldMsgs[0],
              });
            }
          });
        }
        const error = new Error(errorMsg) as Error & {
          tokenConsumed?: boolean;
          firstField?: string;
        };
        error.tokenConsumed = result.tokenConsumed;
        if (firstField) {
          error.firstField = firstField;
        }
        throw error;
      }

      // --- EXPEDIENTE ÚNICO: Consolidación FinOps ---
      const { multas, clearExpediente } = useExpedienteStore.getState();
      let statusConsolidacion = 'creado';

      if (multas && multas.length > 0) {
        try {
          const extractedIdClean = analisisTecnico?.extractedId?.replace(/\D/g, '');
          const resExpediente = await consolidarExpedienteEnDB({
            cedula:
              data.cedula ||
              (extractedIdClean && extractedIdClean.length >= 5 ? extractedIdClean : data.contacto),
            telefono: data.contacto,
            nombre: data.nombre || 'VÍA CAPTURA SIMIT',
            nuevasMultas: multas.map(({ comparendo, fecha, valor, estado }) => ({
              comparendo,
              fecha,
              valor,
              estado,
            })),
          });
          statusConsolidacion = resExpediente.status || 'creado';
          clearExpediente();
        } catch (consolidateError) {
          logger.error('[FinOps] Fallo no crítico en consolidación:', consolidateError);
        }
      }

      if (statusConsolidacion === 'actualizado') {
        toast({
          title: '¡Expediente Actualizado!',
          description:
            'Hemos sumado estas nuevas infracciones a tu portal legal con éxito. Tu caso está blindado.',
          duration: 6000,
        });
      } else {
        toast({
          title: '¡Análisis Iniciado!',
          description:
            'Recibimos tu información con éxito. Hemos creado tu expediente maestro y un asesor lo revisará en breve.',
          duration: 8000,
        });
      }

      // 🎉 ÉXITO: Los datos ya están en Firestore. La Cloud Function 'onConsultationCreated'
      // se encargará de enviar los correos de bienvenida y análisis técnico.

      // 🎉 ÉXITO: Los datos ya están en Firestore y el mail enviado.
      Haptics.success();

      // 🛡️ DEVSECOPS: Liberación de RAM agresiva para Android
      // El worker se mantiene vivo para reconexiones, se limpia en useEffect al desmontar.

      setSuccessData({ docId: result.docId, trackingUuid: result.trackingUuid });
      import('@/lib/pwa/idb-vault').then(({ clearVault, clearDraftFromVault }) =>
        Promise.all([clearVault(), clearDraftFromVault()])
      );

      // Activar banner no intrusivo si el usuario no ha decidido
      mostrarBannerPushNotificacion();

      // 🛡️ MANDATO-FILTRO v8.9.4 — Token de retorno opaco.
      // ANTES: SHA256(cedula) — reversible por fuerza bruta en GPU (espacio ~100M).
      // AHORA: UUID aleatorio sin relación con datos PII del ciudadano.
      // El token sirve SOLO para reconocer al usuario en visitas futuras, nunca para recuperar la cédula.
      try {
        const returnToken = crypto.randomUUID();
        localStorage.setItem('desmulta_client_token', returnToken);
        // Guardar shortId activo para el mini-dashboard
        if (result.trackingUuid) {
          localStorage.setItem('desmulta_active_case', result.trackingUuid);
        }
      } catch (fError) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('[ReturnToken] Error generando token de retorno:', fError);
        }
      }

      // Cerramos automáticamente tras un periodo extendido de éxito (15s)
      // Eliminado por petición del usuario (UX) para dar tiempo a copiar links o activar notificaciones.
      // setTimeout(onSuccess, 15000);
    } catch (e: unknown) {
      // 🛡️ OFFLINE VAULT: Si se cae la red exactamente al enviar
      if (
        e instanceof TypeError &&
        (e.message === 'Failed to fetch' || e.message === 'Network request failed')
      ) {
        Haptics.success();
        saveToVault(data).catch(() => {});
        setSuccessData({ docId: 'OFFLINE_PENDING' });
        import('@/lib/pwa/idb-vault').then(({ clearDraftFromVault }) => clearDraftFromVault());
        toast({
          title: 'Conexión Inestable 📶',
          description:
            'No hay problema. Hemos encriptado y guardado tu caso en tu dispositivo. Se enviará en automático cuando recuperes la señal.',
          duration: 10000,
        });
        setIsFormProcessing(false);
        return;
      }

      Haptics.error();
      const tokenConsumed = (e as { tokenConsumed?: boolean }).tokenConsumed;
      const message =
        e instanceof Error
          ? e.message
          : 'Tuvimos un pequeño inconveniente. Por favor, intenta de nuevo más tarde.';

      toast({
        variant: 'destructive',
        title: tokenConsumed ? 'Transacción Consumida' : 'Revisa estos detalles',
        description: message,
      });

      // Desplazar suavemente y enfocar al primer campo con error de validación del backend
      if (e instanceof Error && 'firstField' in e && e.firstField) {
        const fieldName = (e as Error & { firstField?: string }).firstField;
        const el = document.querySelector(`[name="${fieldName}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement)?.focus();
      }

      // 🛡️ DEVSECOPS (Blindaje v8.9.9)
      // Si el servidor falla la petición por un error de seguridad (403, token inválido),
      // DEBEMOS reiniciar Turnstile obligatoriamente. Un token rechazado jamás será aceptado
      // en un segundo intento. Esto previene el bug de "bucle infinito de carga".
      if (
        tokenConsumed ||
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('seguridad') ||
        message.toLowerCase().includes('escudo')
      ) {
        setCfToken(null);
        setTurnstileRefreshCount((c) => c + 1);
      }
      setIsFormProcessing(false);
    }
  };

  if (form.formState.isSubmitted && successData) {
    const evidenceUrl = form.getValues('evidenceUrl');
    // Generar un ID de prueba visual (los primeros 12 caracteres del token Cloudflare)
    const proofId = cfToken ? cfToken.slice(0, 12).toUpperCase() : 'EXPEDIENTE-PROTEGIDO';

    return (
      <>
        <StepSuccess
          successData={successData}
          evidenceUrl={evidenceUrl}
          proofId={proofId}
          fcmToken={fcmToken}
          hasInteractedWithPush={hasInteractedWithPush}
          isHandlingPermission={isHandlingPermission}
          requestNotificationPermission={requestNotificationPermission}
          setHasInteractedWithPush={setHasInteractedWithPush}
          onSuccess={onSuccess}
          toast={toast}
          isSimitMode={isSimitMode}
          sugerencia={sugerirTipoDocumento(
            form.getValues().antiguedad,
            form.getValues().estadoCoactivo,
            form.getValues().tipoInfraccion
          )}
          formValues={{
            nombre: form.getValues().nombre,
            cedula: form.getValues().cedula,
            placa: form.getValues().placa || 'N/A',
            contacto: form.getValues().contacto,
            email: form.getValues().email || '',
            ciudad: form.getValues().ciudad || '',
            autoridad: '',
            direccion: '',
          }}
        />
        {mostrarBannerPush && (
          <PushPermissionBanner
            docId={successData.docId}
            isHandlingPermission={isHandlingPermission}
            onActivar={requestNotificationPermission}
            onCerrar={cerrarBannerPush}
            estadoPermiso={estadoPermiso}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(
              async (data) => {
                await onSubmit(data);
              },
              (errors) => {
                if (Object.keys(errors).length > 0) {
                  Haptics.error();
                }
                const errorKeys = Object.keys(errors);
                const firstFieldName = errorKeys[0];
                const firstError = (errors as Record<string, { message?: string }>)[firstFieldName];
                const label =
                  firstFieldName in FIELD_LABELS
                    ? FIELD_LABELS[firstFieldName as keyof typeof FIELD_LABELS]
                    : firstFieldName;

                toast({
                  variant: 'destructive',
                  title: 'Formulario Incompleto',
                  description: `El campo "${label}" tiene un problema: ${firstError?.message || 'Revisa el formato.'}`,
                });
                // Desplazar suavemente al campo con error y enfocarlo
                const el = document.querySelector(`[name="${firstFieldName}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (el as HTMLElement)?.focus();
              }
            )(e);
          }}
          className="space-y-8 md:space-y-10"
        >
          <div ref={topRef} className="px-1">
            <Progress
              value={isSimitMode ? 100 : step === 0 ? 33 : step === 1 ? 66 : 100}
              className="h-2 bg-muted/80"
            />
          </div>

          {/* ── Rate-limit banner — visible inline, encima de todo ── */}
          {rateLimitState.active && (
            <div className="px-1">
              <RateLimitBanner
                secondsRemaining={rateLimitState.secondsRemaining}
                message={rateLimitState.message}
                onExpire={clearRateLimit}
                onDismiss={clearRateLimit}
              />
            </div>
          )}

          {/* ── Duplicate Consultation Banner ── */}
          {duplicateError && (
            <div className="px-1">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] p-4 text-amber-500 text-sm flex items-center gap-3">
                <AlertTriangle size={20} className="shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Consulta Duplicada</p>
                  <p>{duplicateError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateError(null)}
                  className="text-amber-500/60 hover:text-amber-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* El enrutador mágico lee la URL de WhatsApp y rellena la placa */}
          <Suspense fallback={null}>
            <EnrutadorMagico form={form} />
          </Suspense>

          {/* 🛡️ BANNER DE MODO DEGRADADO CON RECUPERACIÓN MANUAL */}
          {isSystemDegraded && (
            <div className="px-1 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] p-5 flex flex-col gap-4 relative overflow-hidden shadow-lg shadow-amber-500/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="shrink-0 p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                    <Activity size={24} className="text-amber-500" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-black text-amber-400 uppercase tracking-tight text-sm">
                      Modo Contingencia Activo
                    </p>
                    <p className="text-amber-500/80 text-sm mt-1 leading-snug">
                      Los sistemas de Inteligencia Artificial están experimentando inestabilidad
                      temporal. Hemos habilitado el canal de revisión manual para no detener tu
                      trámite.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleForceRecover}
                  disabled={isRecovering}
                  className="relative z-10 w-full mt-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl h-12 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 overflow-hidden"
                >
                  <RefreshCw size={18} className={isRecovering ? 'animate-spin' : ''} />
                  {isRecovering ? 'RECONECTANDO...' : 'INTENTAR RECONECTAR SISTEMA'}
                </button>
              </div>
            </div>
          )}

          {/* Honeypot anti-bot — invisible para humanos, trampa para crawlers */}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
            <label htmlFor="website_url">Sitio web (no completar)</label>
            <input
              type="text"
              id="website_url"
              tabIndex={-1}
              autoComplete="off"
              {...form.register('websiteHoneypot')}
            />
          </div>

          {step === 0 && !isSimitMode && !isSystemDegraded && (
            <StepPreAnalisis form={form} setStep={setStep} />
          )}

          {step === 1 && !isSimitMode && !isSystemDegraded && (
            <StepViabilidad form={form} handleNextStep={handleNextStep} />
          )}

          {step === 2 && (
            <StepContacto
              form={form}
              isSimitMode={isSimitMode}
              setStep={setStep}
              showCedula={showCedula}
              setShowCedula={setShowCedula}
              cfToken={cfToken}
              setCfToken={setCfToken}
              setTurnstileRefreshCount={setTurnstileRefreshCount}
              activarEscaner={activarEscaner}
              setActivarEscaner={setActivarEscaner}
              isScanningOCR={isScanningOCR}
              setIsScanningOCR={setIsScanningOCR}
              analisisTecnico={analisisTecnico}
              setAnalisisTecnico={setAnalisisTecnico}
              turnstileRefreshCount={turnstileRefreshCount}
              isSubmitting={isSubmitting || isFormProcessing}
              formatCedula={formatCedula}
              formatPlaca={formatPlaca}
              formatPhone={formatPhone}
              nonce={nonce}
              fcmToken={fcmToken}
              isSystemDegraded={isSystemDegraded}
            />
          )}

          {/* Footer info (only on Step 2) */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-4 pt-4 border-t border-border/20">
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-black opacity-60">
                <ShieldCheck size={12} className="text-primary" />
                <span>Conexión Cifrada y Segura</span>
              </div>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}
