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
import { Loader2, ShieldAlert } from 'lucide-react';
import { verifyGodMode } from '@/app/admin/audit-actions';
import { useToast } from '@/hooks/use-toast';

interface ModalAuthGodModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCancel?: () => void;
  actionName: string;
}

export function ModalAuthGodMode({
  isOpen,
  onClose,
  onSuccess,
  onCancel,
  actionName,
}: ModalAuthGodModeProps) {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    onClose();
    if (onCancel) onCancel();
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La contraseña no puede estar vacía',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await verifyGodMode(password);
      if (result.success) {
        onSuccess();
        onClose();
        setPassword('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: result.error || 'La contraseña proporcionada es incorrecta',
        });
      }
    } catch (_err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un error al validar la contraseña del Modo Dios',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[425px] bg-black border-yellow-500/50"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById('godmode-password-input')?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-yellow-500 uppercase tracking-tight">
            <ShieldAlert className="w-5 h-5 text-yellow-500" />
            Autenticación Modo Dios
          </DialogTitle>
          <DialogDescription className="text-zinc-400 font-medium">
            Para ejecutar la acción de <strong className="text-zinc-200">{actionName}</strong>,
            debes confirmar tu identidad de SuperAdmin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="flex justify-center">
            <Input
              id="godmode-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña Modo Dios..."
              className="w-full text-center text-xl font-bold h-14 border-2 focus:border-yellow-500 rounded-xl bg-zinc-900 text-white placeholder:text-zinc-600"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="rounded-xl border-zinc-700 bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || password.length === 0}
              className="rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-black tracking-widest uppercase text-xs"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Autorizar Acción
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
