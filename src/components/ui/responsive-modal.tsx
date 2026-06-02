'use client';

/**
 * ResponsiveModal v2.1.0
 *
 * FIX SCROLL ANDROID (bug principal reportado):
 *
 * Había 3 capas que se bloqueaban entre sí en Android:
 *
 * 1. `touch-action: manipulation` del body (.pwa-native-feel) le dice al browser
 *    que solo procese taps. En Vaul (Drawer), el gesto de scroll vertical DENTRO
 *    del drawer necesita que el contenedor scrollable tenga `touch-action: pan-y`
 *    (o `auto`) para que Android Chrome lo pase al scroll engine, no al drag engine.
 *    Sin esto, Android interpreta el desliz vertical como intento de cerrar el drawer.
 *
 * 2. DrawerContent tenía `overflow-y-auto` directamente en el componente raíz de Vaul.
 *    Vaul 1.x necesita que el elemento scrollable sea un hijo del DrawerContent,
 *    NO el DrawerContent mismo — si el DrawerContent scrollea, Vaul pierde el tracking
 *    del gesto y el swipe-to-close interfiere con el scroll.
 *
 * 3. El contenedor interno `<div className="p-4...">` no tenía altura máxima ni
 *    overflow definido, así que el contenido desbordaba sin crear un scroll area real.
 *
 * SOLUCIÓN:
 * - DrawerContent: sin overflow-y-auto (deja que Vaul maneje el drag).
 * - Div interior scrollable: `overflow-y-auto` + `touch-action: pan-y` explícito.
 *   Esto le dice a Android "en esta zona, pan vertical = scroll, no drag de drawer".
 * - `overscroll-behavior: contain` para que el scroll no "burbujee" al body.
 * - `-webkit-overflow-scrolling: touch` para el momentum nativo en iOS.
 */

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Haptics } from '@/lib/utils/haptics';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  customHeader?: boolean;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  icon,
  className = '',
  customHeader = false,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  React.useEffect(() => {
    try {
      if (open) Haptics.modalOpen();
      else if (open === false) Haptics.modalClose();
    } catch {}
  }, [open]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {/*
         * FIX ANDROID SCROLL:
         * - NO overflow-y-auto aquí: Vaul necesita controlar el drag en DrawerContent.
         *   Moverlo al hijo scrollable es lo correcto.
         * - max-h-[90dvh]: sigue presente para limitar la altura máxima del drawer.
         */}
        <DrawerContent className="bg-background dark:bg-black/95 border-t border-border/40 text-foreground dark:text-white backdrop-blur-2xl max-h-[90dvh] flex flex-col">
          {/* Accesibilidad */}
          <DrawerTitle className="sr-only">
            {typeof title === 'string' ? title : 'Ventana Modal Móvil'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {typeof description === 'string'
              ? description
              : 'Información detallada en ventana modal.'}
          </DrawerDescription>

          {/* Header fijo (no scrollea) */}
          {!customHeader && (
            <DrawerHeader className="text-left px-6 relative shrink-0">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 pointer-events-none">
                Desliza abajo para cerrar
              </div>
              <div className="flex items-center gap-3 mt-2">
                {icon && <div className="shrink-0">{icon}</div>}
                <div>
                  <DrawerTitle className="text-2xl font-black">{title}</DrawerTitle>
                  {description && (
                    <DrawerDescription className="text-muted-foreground mt-1 font-medium">
                      {description}
                    </DrawerDescription>
                  )}
                </div>
              </div>
            </DrawerHeader>
          )}

          {/*
           * FIX ANDROID SCROLL — zona scrollable real:
           * - overflow-y-auto: crea el scroll container correcto (hijo de DrawerContent).
           * - touch-action: pan-y — CRÍTICO para Android. Sin esto el browser
           *   interpreta el desliz vertical como gesto de cerrar el drawer.
           * - overscroll-behavior: contain — evita que el scroll llegue al body.
           * - -webkit-overflow-scrolling: touch — scroll con inercia en iOS Safari.
           * - flex-1 min-h-0 — necesario en flex column para que el div ocupe
           *   el espacio restante y el overflow funcione correctamente.
           */}
          <div
            className={`p-4 md:p-6 flex-1 min-h-0 overflow-y-auto ${className}`}
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {customHeader && (
              <div className="w-full text-center mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 pointer-events-none">
                Desliza abajo para cerrar
              </div>
            )}
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog — sin cambios, ya funciona correctamente
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none focus-visible:outline-none',
          className
        )}
      >
        <DialogTitle className="sr-only">
          {typeof title === 'string' ? title : 'Ventana Modal'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {typeof description === 'string'
            ? description
            : 'Información detallada en ventana modal.'}
        </DialogDescription>
        <div
          className={`glass rounded-[2rem] border-white/20 m-4 shadow-3xl bg-white/95 dark:bg-black/90 flex flex-col max-h-[85dvh] overflow-hidden ${className}`}
        >
          {!customHeader && (
            <DialogHeader className="p-6 md:p-8 pb-4 shrink-0">
              <div className="flex flex-col items-center justify-center text-center">
                {icon && <div className="mb-4 shrink-0">{icon}</div>}
                <DialogTitle className="text-3xl font-black text-foreground tracking-tight">
                  {title || 'Ventana Informativa'}
                </DialogTitle>
                <DialogDescription
                  className={cn(
                    'text-base md:text-lg text-muted-foreground mt-2 font-medium',
                    !description && 'sr-only'
                  )}
                >
                  {description || 'Detalles adicionales sobre el proceso legal y técnico.'}
                </DialogDescription>
              </div>
            </DialogHeader>
          )}
          <div className="p-6 md:p-8 pt-2 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
