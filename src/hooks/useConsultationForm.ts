import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ConsultationSchema, SimitCaptureSchema } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { useRateLimit } from '@/components/ui/RateLimitBanner';
import { useSystemHealth } from '@/components/providers/SystemHealthProvider';
import { useWebPush } from '@/hooks/useWebPush';
import type { OCRAnalysisResult } from '@/lib/definitions';

type ConsultationFormData = z.infer<typeof ConsultationSchema>;

export function useConsultationForm(mode: 'full' | 'simit' = 'full') {
  const isSimitMode = mode === 'simit';
  const [step, setStep] = useState(isSimitMode ? 2 : 0);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const [analisisTecnico, setAnalisisTecnico] = useState<OCRAnalysisResult | undefined>();
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [activarEscaner, setActivarEscaner] = useState(false);
  const [showCedula, setShowCedula] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ docId: string; trackingUuid?: string } | null>(
    null
  );
  const topRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { isSystemDegraded, forceRecoverAll } = useSystemHealth();
  const { rateLimitState, handleRateLimitResponse, clearRateLimit } = useRateLimit();
  const webPush = useWebPush();

  const resolverSchema = isSimitMode ? SimitCaptureSchema : ConsultationSchema;

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(resolverSchema),
    defaultValues: {
      cedula: '',
      placa: '',
      nombre: '',
      contacto: '',
      email: '',
      requiresOperatorFiling: false,
      aceptoTerminos: false,
      antiguedad: '',
      tipoInfraccion: '',
      estadoCoactivo: '',
      evidenceUrl: '',
      ciudad: '',
    },
  });

  // Sistema degradado → skip al paso de contacto
  useEffect(() => {
    if (isSystemDegraded && step < 2 && !isSimitMode) setStep(2);
  }, [isSystemDegraded, step, isSimitMode]);

  // Scroll al cambiar de paso
  useEffect(() => {
    if (!topRef.current) return;
    const performScroll = () =>
      topRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
    performScroll();
    const rafId = requestAnimationFrame(performScroll);
    return () => cancelAnimationFrame(rafId);
  }, [step]);

  // Cleanup al desmontar
  useEffect(() => () => {}, []);

  // Recuperar vault si hay datos pendientes
  useEffect(() => {
    import('@/lib/pwa/idb-vault').then(({ hasPendingVaultData, getFromVault }) => {
      hasPendingVaultData().then((hasPending) => {
        if (!hasPending) return;
        getFromVault().then((saved) => {
          if (saved?.data) {
            toast({
              title: '📋 Consulta guardada encontrada',
              description: 'Recuperamos un formulario que no se pudo enviar.',
            });
          }
        });
      });
    });
  }, [toast]);

  return {
    // Estado
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
    // Hooks
    form,
    toast,
    rateLimitState,
    handleRateLimitResponse,
    clearRateLimit,
    isSystemDegraded,
    forceRecoverAll,
    webPush,
    // Helpers
    isSimitMode,
  };
}
