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
}

const QUICK_REPLIES = [
  {
    label: '✅ Todo en orden',
    texto: 'Hola, acabo de revisar tu caso y veo que todo está en orden.',
  },
  {
    label: '📄 Falta documentación',
    texto: 'Falta documentación en tu expediente, por favor revisa tu correo.',
  },
  {
    label: '🎉 Caso resuelto',
    texto: '¡Felicidades! Hemos resuelto tus comparendos exitosamente.',
  },
];

export function ModalNotaOperador({
  isOpen,
  onClose,
  onConfirm,
  estadoDestino,
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
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            ✨ El Toque Humano
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Estás a punto de cambiar el estado a{' '}
            <strong className="text-primary">{estadoDestino}</strong>. ¿Deseas agregar una nota
            personal para el cliente? Esto le llegará por correo o notificación push.
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
            placeholder="Ej: Hola, acabo de revisar tu caso y veo que todo está en orden. Procederemos a..."
            className="w-full min-h-[120px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm text-slate-900 dark:text-white transition-all resize-none shadow-inner"
          />
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <button
            onClick={() => {
              onConfirm(''); // Sin nota
              setNota('');
            }}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Guardar sin nota
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            {nota.trim() ? 'Guardar con Nota' : 'Confirmar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
