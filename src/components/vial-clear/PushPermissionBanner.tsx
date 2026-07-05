'use client';

import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PushPermissionBannerProps {
  docId: string;
  isHandlingPermission: boolean;
  onActivar: (docId: string) => Promise<string | null>;
  onCerrar: () => void;
  estadoPermiso?: NotificationPermission;
}

/**
 * PushPermissionBanner
 *
 * Banner no intrusivo estilo Claude.ai / Telegram Web.
 * Aparece en la parte inferior de la pantalla tras un submit exitoso
 * y pregunta al usuario si desea recibir notificaciones nativas del SO.
 *
 * Uso:
 *   {mostrarBannerPush && (
 *     <PushPermissionBanner
 *       docId={successData.docId}
 *       isHandlingPermission={isHandlingPermission}
 *       onActivar={requestNotificationPermission}
 *       onCerrar={cerrarBannerPush}
 *     />
 *   )}
 */
export function PushPermissionBanner({
  docId,
  isHandlingPermission,
  onActivar,
  onCerrar,
  estadoPermiso = 'default',
}: PushPermissionBannerProps) {
  const isDenied = estadoPermiso === 'denied';

  return (
    <div
      role="dialog"
      aria-label="Activar notificaciones"
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        w-[calc(100%-2rem)] max-w-xl
        flex items-center justify-between gap-3
        bg-white/80 dark:bg-black/60 backdrop-blur-2xl
        border border-white/20 dark:border-white/10
        rounded-3xl shadow-2xl shadow-black/40
        px-4 py-4
        animate-in slide-in-from-bottom-4 fade-in duration-300
      "
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <BellRing className="w-4 h-4 text-primary animate-bounce" />
        </div>
        <p className="text-sm text-foreground font-medium leading-tight line-clamp-2">
          {isDenied
            ? 'Notificaciones bloqueadas. Para recibir alertas, dale "Activar" y luego cambia el permiso en el candado 🔒 del navegador.'
            : '¿Recibir una alerta nativa cuando tu caso tenga novedades?'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => onActivar(docId)}
          disabled={isHandlingPermission || docId === 'OFFLINE_PENDING'}
          className="h-8 px-4 rounded-xl font-bold text-xs uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
        >
          {isHandlingPermission ? '...' : 'Activar'}
        </Button>
        <button
          onClick={onCerrar}
          aria-label="Cerrar banner"
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
