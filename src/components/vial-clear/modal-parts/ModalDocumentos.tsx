/**
 * ModalDocumentos
 * Sub-componente de ModalDetalleExpediente.
 * Maneja la vista y descarga de documentos PDF adjuntos al expediente.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DocumentoPDF {
  base64: string;
  filename: string;
}

interface ModalDocumentosProps {
  documentos: DocumentoPDF[];
  indiceActual: number;
  onCambiarIndice: (nuevoIndice: number) => void;
  onCerrar: () => void;
}

export function ModalDocumentos({
  documentos,
  indiceActual,
  onCambiarIndice,
  onCerrar,
}: ModalDocumentosProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const docActual = documentos[indiceActual] || null;

  React.useEffect(() => {
    if (!docActual) return;
    let url: string | null = null;
    try {
      const byteCharacters = atob(docActual.base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err) {
      console.error('Error al decodificar PDF Base64:', err);
      setBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [docActual]);

  if (documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No hay documentos adjuntos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navegación entre documentos */}
      {documentos.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCambiarIndice(Math.max(0, indiceActual - 1))}
            disabled={indiceActual === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {indiceActual + 1} / {documentos.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCambiarIndice(Math.min(documentos.length - 1, indiceActual + 1))}
            disabled={indiceActual === documentos.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Preview del PDF */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-8 h-[380px] flex flex-col items-center justify-center text-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white"
          onClick={onCerrar}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-125 animate-pulse" />
          <div className="relative w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-2xl">
            <FileText className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">
          Escudo de Seguridad CSP Activo
        </h3>
        <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mb-6">
          Para blindar la plataforma contra inyecciones XSS y fugas de PII, las directivas de seguridad restringen la previsualización incrustada. Abra el visor seguro.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs justify-center">
          <Button
            onClick={() => blobUrl && window.open(blobUrl, '_blank')}
            disabled={!blobUrl}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/10"
          >
            Visor en Nueva Pestaña
          </Button>
          <Button
            onClick={() => {
              if (!blobUrl) return;
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = docActual.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            disabled={!blobUrl}
            variant="outline"
            size="sm"
            className="bg-white/5 hover:bg-white/10 text-white border-white/5 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            Descargar PDF
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">{docActual.filename}</p>
    </div>
  );
}
