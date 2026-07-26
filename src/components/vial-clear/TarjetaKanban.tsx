'use client';

import {
  MapPin,
  Loader2,
  MessageCircle,
  ArrowRightCircle,
  Clock,
  BellOff,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import { KanbanItem } from './TableroFlujoTrabajo';

import DecryptedText from '../ui/DecryptedText';

import { m } from 'framer-motion';

const SIGUIENTE_ESTADO: Record<string, { id: string; label: string }> = {
  NUEVO: { id: 'CONTACTADO', label: 'Contactado' },
  CONTACTADO: { id: 'ESTUDIO', label: 'En Estudio' },
  ESTUDIO: { id: 'APERTURA', label: 'Promover a Caso' },
  APERTURA: { id: 'RADICADO', label: 'Radicar' },
  RADICADO: { id: 'TRAMITE', label: 'En Espera' },
  TRAMITE: { id: 'FINALIZADO', label: 'Finalizar' },
};

export function TarjetaKanban({
  data,
  onAvanzar,
}: {
  data: KanbanItem;
  onAvanzar?: (id: string, estadoSiguiente: string) => void;
}) {
  const esCaptura = Boolean(data.evidenceUrl);
  const esCaso = data.tipo === 'caso';

  const siguientePaso = SIGUIENTE_ESTADO[data.estado];

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] p-3 rounded-xl relative group overflow-hidden"
    >
      <div className="hidden md:block absolute inset-0 pointer-events-none group-hover:bg-slate-50/50 dark:group-hover:bg-white/[0.02] transition-colors duration-200 ease-out" />

      <div
        className="touch-draggable w-full h-full select-none touch-none cursor-grab active:cursor-grabbing relative z-10 flex flex-col gap-2"
        data-item-id={data.id}
        data-estado-actual={data.estado}
      >
        {/* Indicador lateral sutil */}
        <div
          className={`absolute left-[-12px] top-[-12px] bottom-[-12px] w-1 ${esCaso ? 'bg-blue-500/80' : 'bg-primary/80'}`}
        />

        {/* Cabecera compacta: Indicadores y Asignación */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5">
            {/* Dot Type */}
            <div
              className={`w-2 h-2 rounded-full ${esCaso ? 'bg-blue-500' : 'bg-emerald-500'}`}
              title={esCaso ? 'Caso Formal' : 'Solicitud / Lead'}
            />
            {/* Identifier (Placa/Cedula) */}
            <h4 className="text-slate-900 dark:text-foreground font-bold text-sm tracking-tight truncate pointer-events-none">
              {data.placa && data.placa !== 'N/A' ? (
                <DecryptedText
                  parentClassName="pointer-events-auto"
                  animateOn="hoverReveal"
                  speed={40}
                  text={data.placa}
                />
              ) : data.cedula ? (
                <DecryptedText
                  parentClassName="pointer-events-auto"
                  animateOn="hoverReveal"
                  speed={40}
                  text={`C.C. ${data.cedula}`}
                />
              ) : (
                <span className="text-muted-foreground italic text-xs">Sin Id</span>
              )}
            </h4>
          </div>

          {/* Badges Right Side */}
          <div className="flex items-center gap-1">
            {esCaptura && (
              <span className="text-blue-500/70" title="Contiene captura SIMIT">
                <Paperclip className="w-3 h-3" />
              </span>
            )}
            {data.esRecurrente && (
              <span
                className="text-blue-500/70"
                title={`Recurrente (${data.conteoRetornos || 1}x)`}
              >
                <Loader2 className="w-3 h-3 animate-spin duration-1000" />
              </span>
            )}
            {data._lastPushAttempt?.status === 'error' && (
              <span
                className="text-red-500 animate-pulse"
                title={`Fallo push: ${data._lastPushAttempt.reason}`}
              >
                <AlertCircle className="w-3 h-3" />
              </span>
            )}
            {data._lastPushAttempt?.status === 'token_invalid' && (
              <span className="text-orange-500" title="Token FCM revocado">
                <BellOff className="w-3 h-3" />
              </span>
            )}

            {/* Operator Avatar */}
            {data.assignedToEmail && (
              <div
                className="w-5 h-5 ml-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[9px] font-black flex items-center justify-center uppercase border border-indigo-200 dark:border-indigo-500/30"
                title={`Asignado a: ${data.assignedToEmail}`}
              >
                {data.assignedToEmail.substring(0, 2)}
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo (Nombre y metadatos base) */}
        <div className="flex items-start gap-1.5 pl-3 border-l border-slate-100 dark:border-white/5 ml-1 py-0.5">
          <div className="flex-1 min-w-0 pointer-events-none flex flex-col gap-1">
            <p className="text-slate-600 dark:text-slate-300 text-xs truncate">
              <DecryptedText
                parentClassName="pointer-events-auto font-medium"
                animateOn="hoverReveal"
                speed={40}
                text={data.nombre || 'Usuario Desmulta'}
              />
            </p>

            {/* Metadatos secundarios (Ciudad, Fecha, Teléfono) colapsados en una fila */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-0.5">
              {data.ciudad && (
                <span className="flex items-center gap-0.5 pointer-events-none truncate max-w-[80px]">
                  <MapPin className="w-3 h-3 shrink-0" />{' '}
                  <span className="truncate">{data.ciudad}</span>
                </span>
              )}
              {data.createdAt && (
                <span
                  className={`flex items-center gap-0.5 shrink-0 ${data.estado === 'NUEVO' && Date.now() - new Date(data.createdAt).getTime() > 7200000 ? 'text-red-500 animate-pulse' : ''}`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(data.createdAt).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Actions Hover */}
          <div className="flex flex-col items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shrink-0">
            {data.contacto && (
              <a
                href={`https://wa.me/57${data.contacto.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Botón Avanzar (Restaurado en todas las vistas por preferencia del usuario) */}
        {siguientePaso && onAvanzar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAvanzar(data.id, siguientePaso.id);
            }}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-[10px] font-bold uppercase text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors active:scale-95 pointer-events-auto"
          >
            <span>Avanzar a {siguientePaso.label}</span>
            <ArrowRightCircle className="w-3 h-3" />
          </button>
        )}
      </div>
    </m.div>
  );
}
