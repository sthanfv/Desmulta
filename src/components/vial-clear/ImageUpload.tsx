'use client';

import React, { useState, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, ScanSearch } from 'lucide-react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { comprimirCaptura } from '@/lib/optimizador-imagenes';
import { useSIMITValidator } from '@/hooks/useSIMITValidator';
import type { InfoEducativa } from '@/hooks/useSIMITValidator';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import { Haptics } from '@/lib/utils/haptics';
import type { OcrWord } from '@/components/vial-clear/AnalizadorDocumentos';
import type { OCRAnalysisResult } from '@/lib/definitions';
import { SecuenciaEducativa } from '@/components/interactive/SecuenciaEducativa';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  onClear: () => void;
  onOcrStateChange?: (scanning: boolean, progress: number, words: OcrWord[]) => void;
  /** Callback que entrega la imagen en base64 para el escáner láser */
  onPreviewReady?: (dataUrl: string | null) => void;
  /**
   * @param {OCRAnalysisResult | undefined} analisis - El dictamen del motor técnico reconstruido.
   */
  onAnalisisTecnico?: (analisis: OCRAnalysisResult | undefined) => void;

  className?: string;
  required?: boolean;
  currentUrl?: string;
}

export function ImageUpload({
  onUploadSuccess,
  onClear,
  onOcrStateChange,
  onPreviewReady,
  onAnalisisTecnico,
  className,
  required,
  currentUrl,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(!!currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  /** Información educativa de los códigos CNT detectados por el OCR — null si no aplica */
  const [infoEducativas, setInfoEducativas] = useState<InfoEducativa[] | null>(null);
  // removed unused state
  const isCarouselOpenRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🛡️ MANDATO-FILTRO: Validador OCR Zero-Waste — procesa en cliente, no consume servidor
  const { validarImagenSIMIT, analizando, progresoOCR, errorOCR, limpiarErrorOCR } =
    useSIMITValidator();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    limpiarErrorOCR();

    // Mostrar previsualización optimista antes del OCR
    // y notificar al padre para que el escáner láser tenga la imagen
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onPreviewReady?.(dataUrl);
    };
    reader.readAsDataURL(selectedFile);

    // ─── FILTRO ZERO-WASTE: OCR en el dispositivo del usuario ───
    // Si la imagen no parece un SIMIT real, se bloquea AQUÍ.
    // Nunca tocará Vercel Blob ni Firebase. Costo evitado: 100%.
    const { addMultas } = useExpedienteStore.getState();
    const resultado = await validarImagenSIMIT(selectedFile);

    if (onOcrStateChange) {
      onOcrStateChange(false, 100, resultado.palabrasDetectadas || []);
    }

    if (!resultado.esValida) {
      Haptics.error();
      // MANTENER PREVIEW: No hacemos setPreview(null) para que el usuario
      // vea qué imagen fue rechazada.
      onAnalisisTecnico?.(undefined);
      setError(
        resultado.error || errorOCR || 'Imagen rechazada: No se detectaron datos del SIMIT.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // ✅ Éxito en validación - Feedback háptico según el veredicto legal
    if (resultado.ocrData?.status === 'PRESCRITO') {
      Haptics.success();
    } else {
      Haptics.tap();
    }

    // 🧠 MOTOR TÉCNICO: Burbujear dictamen heurístico al formulario padre
    onAnalisisTecnico?.(resultado.ocrData);

    // 📚 EDUCATIVA: Si el OCR detectó códigos CNT, mostrar la tarjeta educativa multi-comparendo
    if (resultado.infoEducativas && resultado.infoEducativas.length > 0) {
      isCarouselOpenRef.current = true;
      setInfoEducativas(resultado.infoEducativas);
    }

    // --- EXPEDIENTE ÚNICO: Alimentar el Store con las multas detectadas ---
    if (resultado.multasExtraidas && resultado.multasExtraidas.length > 0) {
      addMultas(resultado.multasExtraidas);
    }

    // ✅ OCR aprobado: Iniciamos la subida automáticamente.
    // El escudo de Turnstile se reserva exclusivamente para el envío del formulario final.
    setWarning(resultado.ocrData?.technicalDictum || null);
    const archivoFinal =
      resultado.archivoOptimizado || (await comprimirCaptura(selectedFile, 1200, 0.9));

    ejecutarUpload(archivoFinal);
  };

  /**
   * Ejecuta el upload al Blob Storage con el archivo provisto.
   */
  const ejecutarUpload = React.useCallback(
    async (archivo: File) => {
      setIsUploading(true);

      try {
        const auth = getAuth();
        const authorUid = auth.currentUser?.uid;

        const response = await fetch(`/api/upload?filename=${encodeURIComponent(archivo.name)}`, {
          method: 'POST',
          body: archivo,
          headers: {
            ...(authorUid ? { 'x-author-uid': authorUid } : {}),
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 429) {
            throw new Error(data.error || '¡Has alcanzado el límite de cargas por hoy!');
          }
          if (response.status === 403 && data.tokenConsumed) {
            throw new Error(data.error || 'Validación de seguridad fallida. Token consumido.');
          }
          throw new Error(
            'No pudimos subir tu foto en este momento. Por favor verifica tu conexión e intenta otra vez.'
          );
        }

        const blob = (await response.json()) as { url: string };
        setIsUploaded(true);
        onUploadSuccess(blob.url);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        setPreview(null);
        setError(errorMsg);
        setIsUploaded(false);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const handleClear = () => {
    setPreview(null);
    setError(null);
    setWarning(null);
    setInfoEducativas(null);

    setIsUploaded(false);
    onClear();
    onPreviewReady?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Avanza el índice cada 3 segundos MIENTRAS esté analizando
  React.useEffect(() => {
    if (analizando) {
      setLoadingTextIndex(0);
      const interval = setInterval(() => {
        setLoadingTextIndex((prev) => {
          if (prev >= 3) {
            clearInterval(interval);
            return 4; // Índice final (vacío)
          }
          return prev + 1;
        });
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setLoadingTextIndex(0);
    }
  }, [analizando]);

  const loadingTexts = [
    'Descargando paquetes de reconocimiento óptico...',
    'Configurando motor de análisis avanzado...',
    'Optimizando modelos para tu dispositivo...',
    'Escaneando documento...',
    '', // desaparece
  ];

  // Estado de carga: OCR activo o upload en curso
  const procesando = analizando || isUploading;
  const mensajeCarga =
    isUploading && !analizando ? 'Asegurando evidencia...' : loadingTexts[loadingTextIndex];

  // Efecto para reportar cambios de progreso al padre
  React.useEffect(() => {
    if (onOcrStateChange && analizando) {
      onOcrStateChange(true, progresoOCR, []);
    }
  }, [analizando, progresoOCR, onOcrStateChange]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
          <ImageIcon size={16} className="text-primary" />
          Captura del SIMIT {required ? '(Obligatoria)' : '(Opcional)'}
        </label>
        {preview && (
          <button
            onClick={handleClear}
            className="text-[10px] font-bold text-red-500 uppercase hover:underline"
          >
            Eliminar
          </button>
        )}
      </div>

      <div
        onClick={() => {
          if (!preview && !procesando) {
            Haptics.tap();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          'relative min-h-[140px] rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden',
          preview
            ? 'border-primary/50 bg-primary/5'
            : 'border-white/10 hover:border-primary/40 hover:bg-white/5 bg-black/20',
          (error || errorOCR) && 'border-red-500/50 bg-red-500/5'
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          disabled={procesando}
        />

        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="wait">
            {preview ? (
              <m.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'relative w-full aspect-video md:aspect-[16/10] rounded-[1.5rem] overflow-hidden shadow-2xl transition-all duration-500 border border-white/10 group/preview',
                  procesando && 'pointer-events-none'
                )}
              >
                {/* Capa 1: Fondo desenfocado para estética premium */}
                <Image
                  src={preview}
                  alt=""
                  fill
                  className="object-cover blur-2xl opacity-40 scale-110"
                  unoptimized
                />

                {/* Capa 2: Imagen real completa (Contain) */}
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <Image
                    src={preview}
                    alt="Previsualización SIMIT"
                    fill
                    className="object-contain drop-shadow-2xl transition-transform duration-700 group-hover/preview:scale-[1.02]"
                    unoptimized
                  />
                </div>

                {/* Capa 3: Overlay de cristal sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                {procesando && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] overflow-hidden rounded-xl border-2 border-primary/50">
                    {/* Animación del escáner láser integrada unificada */}
                    {analizando && (
                      <div className="w-full h-24 absolute animate-scan-forense z-10 pointer-events-none">
                        <div className="w-full h-[3px] bg-green-400 shadow-[0_0_24px_6px_rgba(74,222,128,0.9),0_0_60px_10px_rgba(74,222,128,0.3)]" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20">
                      {analizando ? (
                        <ScanSearch className="w-10 h-10 text-primary animate-pulse" />
                      ) : (
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                      )}
                      {mensajeCarga && (
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] text-center px-4 drop-shadow-md">
                          {mensajeCarga}
                        </span>
                      )}
                      {/* Barra de progreso unificada para toda la fase de reconocimiento */}
                      {analizando && progresoOCR > 0 && (
                        <div className="w-40 h-1.5 bg-black/50 border border-white/10 rounded-full overflow-hidden shadow-inner">
                          <m.div
                            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progresoOCR}%` }}
                            transition={{ ease: 'easeOut', duration: 0.3 }}
                          />
                        </div>
                      )}
                      {/* Ya no requerimos el spinner de cargandoModelo separado, ya que la barra y textos unifican la experiencia */}
                    </div>
                  </div>
                )}
                {!procesando && isUploaded && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </m.div>
            ) : (
              <m.div key="upload" className="flex flex-col items-center text-center space-y-3 p-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                  <Upload size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Click para subir captura</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG hasta 5MB</p>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </LazyMotion>

        {(error || errorOCR) && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-red-600/95 text-white shadow-2xl border border-red-400/30 flex flex-col gap-2 z-50"
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
              <AlertCircle size={14} className="animate-pulse" />
              <span>Incidente de Procesamiento</span>
            </div>
            <p className="text-[10px] font-medium leading-tight opacity-90">
              {error || errorOCR}
            </p>
          </m.div>
        )}

        {warning && !error && !errorOCR && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-amber-500/95 text-black shadow-2xl border border-amber-400/30 flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
              <ScanSearch size={14} className="animate-pulse" />
              <span>Aviso de Escaneo</span>
            </div>
            <p className="text-[10px] font-bold leading-tight opacity-90">{warning}</p>
          </m.div>
        )}
      </div>

      {/* Tarjeta educativa: se muestra cuando el OCR identifica códigos CNT de forma interactiva */}
      {infoEducativas && (
        <SecuenciaEducativa
          infoList={infoEducativas}
          onClose={() => {
            setInfoEducativas(null);
            isCarouselOpenRef.current = false;
          }}
        />
      )}
    </div>
  );
}
