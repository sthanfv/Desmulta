'use client';

import {
  GripVertical,
  Image as ImageIcon,
  Phone,
  MapPin,
  Loader2,
  MessageCircle,
  ArrowRightCircle,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import { KanbanItem } from './TableroFlujoTrabajo';
import { TarjetaPremium } from '../ui/TarjetaPremium';
import { maskData } from '@/lib/security/masking';

import { motion } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-none dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] p-4 rounded-2xl relative group overflow-hidden"
    >
      <div
        className="touch-draggable w-full h-full select-none touch-none cursor-grab active:cursor-grabbing relative z-10"
        data-item-id={data.id}
        data-estado-actual={data.estado}
      >
        {/* Glow de fondo premium en dark mode */}
        <div className="absolute -inset-24 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />

        {/* Indicador lateral sutil */}
        <div
          className={`absolute left-[-16px] top-[-16px] bottom-[-16px] w-1.5 ${esCaso ? 'bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-primary/80 shadow-[0_0_15px_rgba(var(--primary),0.5)]'}`}
        />

        {/* Cabecera de la tarjeta */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-muted-foreground/80 border-slate-200 dark:border-white/10">
            {esCaso ? '📂 CASO' : '👤 SOLICITUD'}
          </span>

          <div className="flex items-center gap-1.5">
            {data.esRecurrente && (
              <span
                className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1"
                title={`Este usuario ha regresado ${data.conteoRetornos || 1} veces`}
              >
                <Loader2 className="w-2 h-2 animate-spin duration-1000" /> RECURRENTE
              </span>
            )}
            {esCaptura && (
              <span
                className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 p-1 rounded-md"
                title="Captura SIMIT"
              >
                <ImageIcon className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          {/* El Grip ahora actúa como indicador visual de arrastre */}
          <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0 pointer-events-none" />
          <div className="flex-1 min-w-0 pointer-events-none">
            <h4 className="text-slate-900 dark:text-foreground font-black text-base uppercase tracking-tight truncate">
              {data.placa && data.placa !== 'N/A'
                ? maskData(data.placa, 'plate')
                : data.cedula
                  ? `C.C. ${maskData(data.cedula, 'id')}`
                  : 'Sin Id'}
            </h4>
            <p className="text-slate-500 dark:text-muted-foreground text-xs truncate">
              {data.nombre ? maskData(data.nombre, 'name') : 'Usuario Desmulta'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 pointer-events-none">
                  <Phone className="w-3 h-3" />{' '}
                  {data.contacto ? maskData(data.contacto, 'phone') : 'Sin contacto'}
                </p>
              </div>
              {data.ciudad && (
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 pointer-events-none">
                  <MapPin className="w-3 h-3" /> {data.ciudad}
                </p>
              )}
            </div>

            {esCaptura && data.evidenceUrl && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 pointer-events-none">
                <Image
                  src={data.evidenceUrl}
                  alt="SIMIT"
                  fill
                  className="object-cover opacity-60 group-hover:opacity-100"
                />
              </div>
            )}
          </div>

          {siguientePaso && onAvanzar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAvanzar(data.id, siguientePaso.id);
              }}
              className="md:hidden w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-primary/10 hover:text-primary border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-muted-foreground transition-colors active:scale-95 pointer-events-auto"
            >
              <span>Avanzar a {siguientePaso.label}</span>
              <ArrowRightCircle className="w-4 h-4" />
            </button>
          )}

          {data.createdAt && (
            <p
              className={`text-[10px] font-bold mt-2 flex items-center gap-1 pointer-events-none ${
                data.estado === 'NUEVO' && Date.now() - new Date(data.createdAt).getTime() > 7200000
                  ? 'text-red-500 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              {new Date(data.createdAt).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
