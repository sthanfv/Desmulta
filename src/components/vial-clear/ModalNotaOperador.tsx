'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ModalNotaOperadorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nota: string) => void;
  estadoDestino: string;
  esRetroceso?: boolean;
}

const QUICK_REPLIES = [
  {
    label: '✅ Todo en orden',
    texto: 'Hola, acabo de revisar tu caso y veo que todo está en orden. Seguimos avanzando según lo planeado.',
  },
  {
    label: '📄 Falta documentación',
    texto: 'Hola, nos hacen falta algunos documentos clave para tu expediente. Por favor, revisa tu correo electrónico.',
  },
  {
    label: '⚖️ En análisis legal',
    texto: 'Nuestro equipo jurídico está evaluando detalladamente los argumentos de tu caso para asegurar la mejor defensa.',
  },
  {
    label: '🏛️ En espera de respuesta',
    texto: 'Ya presentamos los documentos. Ahora dependemos de los tiempos legales de la entidad de tránsito para obtener respuesta.',
  },
  {
    label: '📞 Llamada pendiente',
    texto: 'Por favor, mantente atento a tu celular. Un especialista se comunicará contigo muy pronto para darte novedades.',
  },
  {
    label: '🎉 Caso resuelto',
    texto: '¡Felicidades! Hemos resuelto tu caso exitosamente. Revisa el SIMIT/RUNT en las próximas horas.',
  },
];

export function ModalNotaOperador({
  isOpen,
  onClose,
  onConfirm,
  estadoDestino,
  esRetroceso = false,
}: ModalNotaOperadorProps) {
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNota('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(nota.trim());
    setNota(''); // Reset
  };

  const addQuickReply = (reply: string) => {
    setNota(reply);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle
            className={`text-xl font-black flex items-center gap-2 ${esRetroceso ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}
          >
            {esRetroceso ? '⚠️ Regreso de Caso' : '✨ El Toque Humano'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            {esRetroceso ? (
              <>
                Estás regresando este caso a la etapa{' '}
                <strong className="text-red-500">{estadoDestino}</strong>. Por motivos de seguridad,
                es <strong>obligatorio</strong> escribir una justificación.
              </>
            ) : (
              <>
                Estás a punto de avanzar el estado a{' '}
                <strong className="text-primary">{estadoDestino}</strong>. ¿Deseas agregar una nota
                para el cliente?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => addQuickReply(reply.texto)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors"
                type="button"
              >
                {reply.label}
              </button>
            ))}
          </div>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={500}
            autoFocus
            placeholder={
              esRetroceso
                ? 'Escribe la razón obligatoria por la que regresas este caso...'
                : 'Ej: Hola, acabo de revisar tu caso y veo que todo está en orden. Procederemos a...'
            }
            className={`w-full min-h-[120px] border p-4 rounded-2xl outline-none focus:ring-1 text-sm transition-all resize-none shadow-inner ${
              esRetroceso
                ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-100 placeholder:text-red-400/50'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 focus:border-primary/50 focus:ring-primary/20 text-slate-900 dark:text-white'
            }`}
          />
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          {!esRetroceso && (
            <button
              onClick={() => {
                onConfirm(''); // Sin nota
                setNota('');
              }}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Guardar sin nota
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={esRetroceso && !nota.trim()}
            className={`px-6 py-2 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2
              ${
                esRetroceso
                  ? nota.trim()
                    ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
              }
            `}
          >
            {esRetroceso ? 'Confirmar Reversión' : nota.trim() ? 'Guardar con Nota' : 'Confirmar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
