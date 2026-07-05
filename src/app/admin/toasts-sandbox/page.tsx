'use client';

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';

export default function ToastsSandboxPage() {
  const { toast } = useToast();

  const triggerSuccess = () => {
    toast({
      title: 'Operación Exitosa',
      description: 'El comparendo ha sido analizado correctamente.',
      variant: 'default',
      className: 'bg-emerald-50 text-emerald-900 border-emerald-200', // Ejemplo de estilo si no usan el default
    });
  };

  const triggerError = () => {
    toast({
      title: 'Error de Validación',
      description: 'El archivo subido no es una imagen válida o está corrupto.',
      variant: 'destructive',
    });
  };

  const triggerRateLimit = () => {
    toast({
      title: 'Límite Excedido (429)',
      description: 'Has realizado demasiadas peticiones. Por favor, espera 10 minutos.',
      variant: 'destructive',
    });
  };

  const triggerInfo = () => {
    toast({
      title: 'Actualización disponible',
      description: 'Hay nuevos términos y condiciones en el portal.',
    });
  };

  const triggerAction = () => {
    toast({
      title: 'Firma detectada',
      description: '¿Deseas guardar esta firma para futuros documentos?',
      action: (
        <Button variant="outline" size="sm" onClick={() => alert('Guardado')}>
          Guardar
        </Button>
      ),
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Galería de Notificaciones (Toasts)</h1>
        <p className="text-muted-foreground mt-2">
          Esta es una página de pruebas interna para visualizar la estética de todos los estados de
          error y éxito del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={triggerSuccess}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-14"
        >
          <CheckCircle2 size={18} />
          Ver Toast de Éxito
        </Button>

        <Button onClick={triggerError} variant="destructive" className="gap-2 h-14">
          <AlertCircle size={18} />
          Ver Toast de Error Común
        </Button>

        <Button
          onClick={triggerRateLimit}
          variant="destructive"
          className="gap-2 h-14 bg-red-800 hover:bg-red-900"
        >
          <ShieldAlert size={18} />
          Ver Toast de Rate Limit (Abuso)
        </Button>

        <Button onClick={triggerInfo} variant="outline" className="gap-2 h-14">
          <Zap size={18} />
          Ver Toast Informativo
        </Button>

        <Button onClick={triggerAction} variant="secondary" className="gap-2 h-14 sm:col-span-2">
          Ver Toast con Botón de Acción
        </Button>
      </div>
    </div>
  );
}
