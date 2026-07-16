'use client';
import { logger } from '@/lib/logger/security-logger';

import React, { useEffect, useState, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64: string;
  filename: string;
}

export function PDFPreviewModal({ isOpen, onClose, base64, filename }: PDFPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [decodeError, setDecodeError] = useState(false);

  useEffect(() => {
    if (!isOpen || !base64) return;

    setIsLoading(true);
    setDecodeError(false);
    setUrl(null);

    let blobUrl: string | null = null;
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      blobUrl = URL.createObjectURL(blob);
      setUrl(blobUrl);
    } catch (err) {
      logger.error('[PDFPreviewModal] Error al decodificar base64:', err);
      setDecodeError(true);
    } finally {
      setIsLoading(false);
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, base64]);

  const handleDownload = useCallback(() => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, filename]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Contenedor principal — ancho completo controlado aquí */}
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
            'w-[calc(100vw-2rem)] max-w-6xl',
            'bg-slate-900 border border-white/10 rounded-2xl shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
            'focus:outline-none'
          )}
        >
          {/* Accesibilidad — elementos requeridos por Radix */}
          <DialogPrimitive.Title className="sr-only">
            Auditoría de Documento Legal
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Previsualización del documento PDF antes de su descarga y emisión final.
          </DialogPrimitive.Description>

          {/* CABECERA */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-wide">
                  Auditoría de Documento
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Valide los datos antes de emitir el documento final
                </p>
              </div>
            </div>
            <DialogPrimitive.Close
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              aria-label="Cerrar vista previa del PDF"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* CUERPO */}
          <div className="p-5 flex flex-col lg:flex-row gap-5 h-[75vh] max-h-[700px]">
            {/* ── Visor de PDF ── */}
            <div className="flex-1 bg-slate-950 rounded-xl border border-white/5 overflow-hidden relative shadow-inner min-h-[300px]">
              {/* Estado: Cargando */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Generando Lienzo...
                  </p>
                </div>
              )}

              {/* Estado: Error de decodificación */}
              {decodeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400 px-8 text-center">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                  <p className="text-sm font-bold text-red-400">Error al procesar el documento</p>
                  <p className="text-xs text-slate-500">
                    El archivo recibido no pudo decodificarse. Cierre e intente generar el documento
                    nuevamente.
                  </p>
                </div>
              )}

              {/* Estado: PDF listo */}
              {!isLoading && !decodeError && url && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-center animate-in fade-in duration-200">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-125 animate-pulse" />
                    <div className="relative w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-2xl">
                      <FileText className="w-10 h-10 text-amber-500" />
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">
                    Escudo de Seguridad CSP Activo
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
                    Para blindar la plataforma contra inyecciones XSS y fugas de PII, las directivas
                    de seguridad restringen la previsualización incrustada. Abra el visor seguro.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
                    <button
                      onClick={() => window.open(url, '_blank')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/10"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visor en Nueva Pestaña
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 border border-white/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar PDF
                    </button>
                  </div>
                </div>
              )}

              {/* Etiqueta de control */}
              {!isLoading && !decodeError && (
                <div className="absolute top-4 left-4 bg-amber-500 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg pointer-events-none">
                  VISTA PREVIA DE CONTROL
                </div>
              )}
            </div>

            {/* ── Panel lateral ── */}
            <div className="w-full lg:w-72 flex flex-col justify-between gap-4 shrink-0">
              <div className="space-y-4">
                {/* Checklist de cumplimiento */}
                <div className="bg-slate-800/50 border border-white/5 p-4 rounded-xl">
                  <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Cumplimiento Legal
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      'Protocolo Ley 2213/2022',
                      'Firma autógrafa digitalizada',
                      'Saneamiento diacríticos',
                      'Métricas Helvetica exactas',
                      'Paginación dinámica A4',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Aviso de edición */}
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-300/80 leading-relaxed">
                    Si detecta errores en el nombre o cédula, cierre esta ventana y corrija los
                    datos en el formulario antes de regenerar.
                  </p>
                </div>

                {/* Nombre del archivo */}
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                    Archivo de Salida
                  </p>
                  <div className="bg-black/40 border border-white/5 p-3 rounded-lg font-mono text-[10px] text-slate-300 break-all select-all hover:bg-black/60 transition-colors leading-relaxed">
                    {filename}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2.5">
                <button
                  onClick={handleDownload}
                  disabled={!url || isLoading}
                  className={cn(
                    'w-full font-black py-3.5 rounded-xl flex items-center justify-center gap-2',
                    'text-xs uppercase tracking-widest transition-all active:scale-95',
                    'shadow-lg shadow-amber-900/20',
                    url && !isLoading
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF Final
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                >
                  Cerrar Auditoría
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
