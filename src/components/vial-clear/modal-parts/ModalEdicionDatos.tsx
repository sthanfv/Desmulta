/**
 * ModalEdicionDatos
 * Sub-componente de ModalDetalleExpediente.
 * Formulario de edición de datos del expediente (nombre, placa, ciudad, etc.)
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, X } from 'lucide-react';

interface DatosEditables {
  nombre: string;
  placa: string;
  ciudad: string;
  operatorNote: string;
}

interface ModalEdicionDatosProps {
  datos: DatosEditables;
  onChange: (campo: keyof DatosEditables, valor: string) => void;
  onGuardar: () => Promise<void>;
  onCancelar: () => void;
  isGuardando: boolean;
}

export function ModalEdicionDatos({
  datos,
  onChange,
  onGuardar,
  onCancelar,
  isGuardando,
}: ModalEdicionDatosProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-nombre" className="text-xs">
            Nombre
          </Label>
          <Input
            id="edit-nombre"
            value={datos.nombre}
            onChange={(e) => onChange('nombre', e.target.value)}
            className="h-8 text-sm"
            placeholder="Nombre del cliente"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-placa" className="text-xs">
            Placa
          </Label>
          <Input
            id="edit-placa"
            value={datos.placa}
            onChange={(e) => onChange('placa', e.target.value.toUpperCase())}
            className="h-8 text-sm font-mono"
            placeholder="ABC123"
            maxLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-ciudad" className="text-xs">
            Ciudad
          </Label>
          <Input
            id="edit-ciudad"
            value={datos.ciudad}
            onChange={(e) => onChange('ciudad', e.target.value)}
            className="h-8 text-sm"
            placeholder="Bogotá"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-nota" className="text-xs">
          Nota del operador
        </Label>
        <textarea
          id="edit-nota"
          value={datos.operatorNote}
          onChange={(e) => onChange('operatorNote', e.target.value)}
          className="w-full h-20 text-sm bg-background border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Observaciones del caso..."
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onCancelar} disabled={isGuardando}>
          <X className="w-3 h-3 mr-1.5" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={onGuardar}
          disabled={isGuardando}
          className="bg-primary text-primary-foreground"
        >
          {isGuardando ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3 h-3 mr-1.5" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}
