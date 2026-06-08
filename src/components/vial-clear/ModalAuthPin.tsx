import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { verifyOperatorPin } from '@/app/admin/audit-actions';
import { useToast } from '@/hooks/use-toast';

interface ModalAuthPinProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  actionName: string;
}

export function ModalAuthPin({
  isOpen,
  onClose,
  onSuccess,
  onCancel,
  actionName,
}: ModalAuthPinProps) {
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    onClose();
    if (onCancel) onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El PIN debe tener 4 dígitos numéricos',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await verifyOperatorPin(pin);
      if (result.success) {
        onSuccess(pin);
        onClose();
        setPin('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'El PIN proporcionado es incorrecto',
        });
      }
    } catch (_err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un error al validar el PIN',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            <Lock className="w-5 h-5 text-red-500" />
            Autenticación Requerida
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
            Para ejecutar la acción de{' '}
            <strong className="text-slate-700 dark:text-slate-200">{actionName}</strong>, debes
            confirmar tu identidad ingresando el PIN Operacional de 4 dígitos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="flex justify-center">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-32 text-center text-4xl tracking-[0.5em] font-black h-16 border-2 focus:border-red-500 rounded-2xl"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="rounded-xl border-slate-200 dark:border-slate-700 font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || pin.length !== 4}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase text-xs"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Validar PIN
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
