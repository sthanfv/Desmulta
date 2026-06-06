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
  if (documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No hay documentos adjuntos</p>
      </div>
    );
  }

  const docActual = documentos[indiceActual];

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
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80"
          onClick={onCerrar}
        >
          <X className="w-4 h-4" />
        </Button>
        <iframe
          src={`data:application/pdf;base64,${docActual.base64}`}
          className="w-full h-[500px]"
          title={docActual.filename}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">{docActual.filename}</p>
    </div>
  );
}
