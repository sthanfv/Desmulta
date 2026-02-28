/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Componente de Entrada de Chat Pro v4.0.2
 * Estética iOS Glassmorphism + Validación Zod
 */

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatInputSchema = z.object({
  message: z.string().min(1, 'Escribe algo...').max(500, 'Mensaje muy largo'),
});

type ChatInputType = z.infer<typeof ChatInputSchema>;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatInputType>({
    resolver: zodResolver(ChatInputSchema),
  });

  const onSubmit = (data: ChatInputType) => {
    onSendMessage(data.message);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-transparent border-t border-white/20">
      <div className="flex gap-3 relative items-center">
        <div className="relative flex-1 group">
          <input
            {...register('message')}
            placeholder="Escriba su duda legal..."
            disabled={isLoading}
            className={cn(
              'w-full bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-3xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-50 placeholder:text-muted-foreground/60 font-medium',
              errors.message && 'border-primary/50 ring-primary/10'
            )}
          />
          {/* Inner shadow for iOS depth */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-[0_8px_24px_rgba(var(--primary-rgb),0.3)] shrink-0 active:scale-90 transition-transform flex items-center justify-center p-0 border-none"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
          ) : (
            <div className="relative">
              <SendHorizonal className="w-6 h-6 text-primary-foreground relative z-10" />
              <div className="absolute inset-0 bg-white/20 blur-lg scale-150 animate-pulse" />
            </div>
          )}
        </Button>
      </div>
      {errors.message && (
        <span className="text-[9px] text-primary font-black mt-2 ml-4 block uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left-2 transition-all">
          {errors.message.message}
        </span>
      )}
    </form>
  );
}
