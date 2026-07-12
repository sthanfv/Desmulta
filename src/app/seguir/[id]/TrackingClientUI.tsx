'use client';

/**
 * TrackingClientUI v2.0
 *
 * Mejoras sobre la versión anterior:
 * - Muestra el timeline REAL de eventos (guardado en public_tracking.eventos)
 * - Si no hay eventos aún, muestra el paso actual con descripción útil
 * - Fecha de último cambio visible
 * - SLA comunicado al cliente (cuándo esperar contacto)
 * - Sin dependencias nuevas — solo lo que ya tienes
 */

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { QRCode } from 'react-qrcode-logo';
import {
  Shield,
  Clock,
  FileCheck,
  CheckCircle2,
  MessageCircle,
  Calendar,
  AlertCircle,
  Gift,
  Trophy,
  Sparkles,
  Bell,
  X,
  QrCode,
} from 'lucide-react';
import Link from 'next/link';

import { TrackingCase, EventoTracking } from '@/lib/definitions';
import { useWebPush } from '@/hooks/useWebPush';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useToast } from '@/hooks/use-toast';
import StoryProgressModal from '@/components/interactive/StoryProgressModal';

// Mapa de pasos del proceso (orden visual)
const PASOS = [
  { id: 1, key: 'pendiente', name: 'Recibido', desc: 'Solicitud en cola de revisión', icon: Clock },
  {
    id: 2,
    key: 'contactado',
    name: 'Contactado',
    desc: 'Asignado a especialista',
    icon: MessageCircle,
  },
  { id: 3, key: 'estudio', name: 'Análisis', desc: 'Estudio jurídico activo', icon: Shield },
  { id: 4, key: 'terminado', name: 'Resuelto', desc: 'Gestión concluida', icon: FileCheck },
];

function getStepForStatus(status: string): number {
  switch (status) {
    case 'pendiente':
      return 1;
    case 'contactado':
      return 2;
    case 'estudio':
    case 'apertura':
    case 'en_proceso':
    case 'documentacion':
      return 3;
    default:
      return 4;
  }
}

const LABELS: Record<string, string> = {
  pendiente: 'Recibido y en Cola',
  contactado: 'Asignado a Especialista',
  estudio: 'Análisis Jurídico',
  apertura: 'Expediente Abierto',
  en_proceso: 'Análisis Técnico Avanzado',
  documentacion: 'Revisión de Documentos',
  radicado: 'Requerimiento Radicado',
  tramite: 'Trámite Administrativo Activo',
  en_espera: 'Esperando Respuesta Oficial',
  resolucion: 'Fase de Resolución',
  finalizado: 'Gestión Concluida',
  terminado: 'Proceso Terminado',
  archivo: 'Expediente Archivado',
  descartado: 'Caso No Viable',
};

const DESCRIPCIONES: Record<string, string> = {
  pendiente:
    'Tu solicitud fue recibida y está en nuestra cola de revisión. Un especialista la tomará pronto.',
  contactado:
    '¡Buenas noticias! Un analista ya tomó tu caso y está preparando la revisión preliminar.',
  estudio:
    'Estamos analizando a fondo tu situación para identificar todos los argumentos a tu favor.',
  apertura:
    'Tu expediente fue abierto formalmente. La gestión ante las autoridades está en marcha.',
  en_proceso: 'El análisis técnico está en etapa avanzada. Estamos preparando los documentos.',
  radicado:
    '✅ Tu requerimiento fue radicado oficialmente. Las autoridades ya tienen el documento.',
  tramite:
    'El trámite está activo ante la entidad de tránsito. Monitoreamos los tiempos de respuesta.',
  finalizado: 'El proceso ha concluido. Verifica tu estado en el RUNT/SIMIT en los próximos días.',
  descartado:
    'Tras evaluar cuidadosamente tu caso, encontramos que actualmente no cuenta con los requisitos legales para una impugnación exitosa. Sabemos que no es la respuesta que esperabas, pero preferimos ser totalmente honestos antes de hacerte invertir en un proceso sin futuro.',
};

function getSLAMessage(status: string): string | null {
  if (status === 'pendiente')
    return 'Recibirás contacto por WhatsApp en las próximas 24 horas hábiles.';
  if (status === 'contactado') return 'Tu especialista te contactará pronto con el plan de acción.';
  return null;
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getEventIcon(tipo: string) {
  switch (tipo) {
    case 'status_change':
      return '🔄';
    case 'nota':
      return '📝';
    case 'documento':
      return '📎';
    default:
      return '📌';
  }
}

export default function TrackingClientUI({
  caseData: initialCaseData,
}: {
  caseData: TrackingCase;
}) {
  const [caseData, setCaseData] = useState<TrackingCase>(initialCaseData);
  const [windowUrl, setWindowUrl] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState(5);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Limpieza de localStorage (TTL Absoluto y LRU)
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('desmulta_last_seen_'));
      const now = Date.now();
      const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

      const keyDates = keys.map((key) => {
        const val = localStorage.getItem(key);
        return { key, date: val ? new Date(val).getTime() : 0 };
      });

      // 1. Limpieza profunda: Eliminar claves huérfanas > 30 días
      keyDates.forEach(({ key, date }) => {
        if (now - date > TTL_30_DAYS) {
          localStorage.removeItem(key);
        }
      });

      // 2. LRU: De las que queden, mantener solo las 5 más recientes
      const remainingKeys = keyDates.filter(({ date }) => now - date <= TTL_30_DAYS);
      if (remainingKeys.length > 5) {
        remainingKeys.sort((a, b) => b.date - a.date); // Recientes primero
        const keysToRemove = remainingKeys.slice(5).map((k) => k.key);
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    } catch (_e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cleanup LS error', _e);
      }
    }

    setWindowUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!initialCaseData?.shortId) return;
    const documentId = initialCaseData.docId || initialCaseData.shortId;
    const unsub = onSnapshot(doc(db, 'public_tracking', documentId), (docSnap) => {
      if (docSnap.exists()) {
        setCaseData(docSnap.data() as TrackingCase);
      }
    });
    return () => unsub();
  }, [initialCaseData?.shortId, initialCaseData?.docId]);

  const currentStep = getStepForStatus(caseData.status);
  const slaMsg = getSLAMessage(caseData.status);

  const eventos: EventoTracking[] = (caseData.eventos || []).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [latestEvent, setLatestEvent] = useState<EventoTracking | null>(null);
  const [newEventsCount, setNewEventsCount] = useState<number>(0);

  // Pasar docId directamente al hook para que el re-registro silencioso
  // funcione aunque localStorage esté vacío (primera visita directa a /seguir/[id]).
  const { requestNotificationPermission, yaTienePermiso, isHandlingPermission } = useWebPush({
    docId: caseData.shortId,
  });

  useEffect(() => {
    if (eventos.length > 0) {
      const savedDateStr = localStorage.getItem(`desmulta_last_seen_${caseData.shortId}`);
      const savedDate = savedDateStr ? new Date(savedDateStr).getTime() : 0;

      const unseenEvents = eventos.filter((e) => new Date(e.fecha).getTime() > savedDate);

      if (unseenEvents.length > 0) {
        setLatestEvent(unseenEvents[0]); // El más reciente (están ordenados desc)
        setNewEventsCount(unseenEvents.length);
        setHasNewNotification(true);
      }
    }
  }, [eventos, caseData.shortId]);

  const dismissNotification = () => {
    if (latestEvent) {
      localStorage.setItem(`desmulta_last_seen_${caseData.shortId}`, latestEvent.fecha);
    } else {
      localStorage.setItem(`desmulta_last_seen_${caseData.shortId}`, new Date().toISOString());
    }
    setHasNewNotification(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.04)_0%,transparent_40%)] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-16 pb-16">
        {/* Banner de Notificación UI */}
        <AnimatePresence>
          {hasNewNotification && latestEvent && (
            <m.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 relative overflow-hidden shadow-[0_4px_20px_rgba(212,175,55,0.15)] flex items-start gap-4"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl pointer-events-none rounded-full" />
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 relative">
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-background rounded-full animate-pulse" />
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-6 relative z-10">
                <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                  {newEventsCount > 1
                    ? `${newEventsCount} actualizaciones nuevas`
                    : 'Nueva Notificación'}
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                    Reciente
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{latestEvent.descripcion}</strong>
                </p>
                {latestEvent.estadoNuevo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nuevo estado: {LABELS[latestEvent.estadoNuevo] || latestEvent.estadoNuevo}
                  </p>
                )}
                <div className="mt-4">
                  <button
                    onClick={dismissNotification}
                    className="text-xs font-bold bg-background text-foreground border border-border hover:bg-muted px-4 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    Marcar como leída
                  </button>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 z-10"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[11px] font-bold uppercase tracking-widest mb-4">
            <Shield className="w-3 h-3" />
            Portal de Seguimiento
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            Radicado <span className="text-primary font-mono">{caseData.shortId}</span>
          </h1>
          <p className="text-muted-foreground text-base">
            Hola <span className="text-foreground font-bold">{caseData.nombre}</span>
            {caseData.ciudad && (
              <>
                {' '}
                · <span className="text-foreground font-bold">{caseData.ciudad}</span>
              </>
            )}
          </p>

          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setIsStoryOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-primary text-xs font-black uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.03] shadow-[0_4px_20px_rgba(245,158,11,0.1)]"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              Ver en Modo Historia (Stories)
            </button>
          </div>
        </m.div>

        {/* Barra de progreso de pasos */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-border hidden md:block" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-700 hidden md:block"
              style={{ width: `${((currentStep - 1) / (PASOS.length - 1)) * 100}%` }}
            />
            <div className="grid grid-cols-4 relative z-10">
              {PASOS.map((paso) => {
                const isActive = paso.id <= currentStep;
                const isCurrent = paso.id === currentStep;
                const Icon = paso.icon;
                return (
                  <div key={paso.id} className="flex flex-col items-center gap-2">
                    <div
                      className={[
                        'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border',
                        isActive
                          ? 'bg-primary border-primary text-primary-foreground shadow-md'
                          : 'bg-card border-border text-muted-foreground',
                        isCurrent ? 'ring-4 ring-primary/20 scale-110' : '',
                      ].join(' ')}
                    >
                      {isActive && paso.id < currentStep ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-xs font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {paso.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </m.div>

        {/* Estado actual */}
        <m.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-3xl p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Estado actual
              </p>
              <h2 className="text-lg font-black text-foreground mb-2">
                {LABELS[caseData.status] || caseData.status}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {DESCRIPCIONES[caseData.status] ||
                  'El equipo está trabajando en tu caso. Te notificaremos por WhatsApp.'}
              </p>

              {slaMsg && (
                <div className="mt-3 flex items-start gap-2 text-xs text-primary bg-primary/5 border border-primary/15 rounded-xl p-3">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{slaMsg}</span>
                </div>
              )}

              {caseData.createdAt && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Última actualización: {formatFecha(caseData.createdAt)}
                </div>
              )}

              {caseData.status === 'descartado' && (
                <div className="mt-4">
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309'}?text=Hola,%20deseo%20hacer%20una%20nueva%20consulta`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Hacer Nueva Consulta
                  </a>
                </div>
              )}
            </div>
          </div>
        </m.div>

        {/* Banner de Referidos VIP: Logro Desbloqueado */}
        {caseData.status !== 'pendiente' &&
          caseData.status !== 'descartado' &&
          caseData.status !== 'archivo' && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="bg-card border-2 border-amber-500/30 rounded-3xl p-6 mb-6 relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.12)] group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-500/20">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider mb-3 border border-amber-500/30 animate-pulse">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    ¡Logro Desbloqueado! 🏆
                  </div>
                  <h3 className="text-xl font-black text-foreground flex items-center gap-2 mb-1.5">
                    Beneficio de Cliente VIP Activo
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    ¡Enhorabuena! Al ser tu caso evaluado y contactado por uno de nuestros
                    especialistas, has desbloqueado la categoría de <strong>Cliente VIP</strong>.
                    Ahora tienes el beneficio exclusivo de <strong>REFERIR</strong> conocidos y
                    recibir comisiones o descuentos del costo en tus trámites o servicio con
                    nosotros. Ten paciencia serás contactado para recibir tu descuento. ¡GRACIAS POR
                    USAR DESMULTA Y AYUDARNOS A CRECER!
                  </p>
                  <Link
                    href="/referidos"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black text-xs font-black uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                  >
                    <Gift className="w-4 h-4" />
                    Reclamar Beneficio VIP
                  </Link>
                </div>
              </div>
            </m.div>
          )}

        {/* Banner de Notificaciones Push */}
        {!yaTienePermiso && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-6 relative overflow-hidden flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Activar notificaciones</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recibe alertas inmediatas sobre cambios en tu expediente.
                </p>
              </div>
            </div>
            <button
              onClick={() => requestNotificationPermission(caseData.shortId)}
              disabled={isHandlingPermission}
              className="ml-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
            >
              {isHandlingPermission ? 'Activando...' : 'Activar'}
            </button>
          </m.div>
        )}

        {/* Bloque para Caso Descartado */}
        {caseData.status === 'descartado' && (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-red-500/30 rounded-3xl p-6 mb-6 relative overflow-hidden shadow-[0_0_25px_rgba(239,68,68,0.12)]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Caso No Viable</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md leading-relaxed">
                Si consideras que hubo un error en nuestro análisis preliminar o posees{' '}
                <strong>nueva evidencia documental</strong> que pueda cambiar el dictamen, nuestro
                equipo está a tu entera disposición.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309'}?text=${encodeURIComponent('Hola, mi caso fue descartado pero me gustaría revisarlo por nueva evidencia.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.03]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Hablar por WhatsApp
                </a>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-sm flex items-center justify-center transition-colors border border-border"
                >
                  Realizar Nueva Consulta
                </Link>
              </div>
            </div>
          </m.div>
        )}

        {/* Notas del operador */}
        <AnimatePresence>
          {caseData.operatorNote && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground mb-1">Nota del especialista</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {caseData.operatorNote}
                  </p>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Timeline de eventos reales */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            Historial de actividad
          </h3>

          {eventos.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Caso recibido en el sistema</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu solicitud fue registrada correctamente. Las actualizaciones aparecerán aquí en
                  tiempo real conforme el equipo avance con tu caso.
                </p>
                {caseData.createdAt && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {formatFecha(caseData.createdAt)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {eventos.slice(0, visibleEventsCount).map((ev, idx) => (
                <m.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 text-base">
                    {getEventIcon(ev.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{ev.descripcion}</p>
                    {ev.estadoNuevo && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {LABELS[ev.estadoNuevo] || ev.estadoNuevo}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-1.5">
                      {formatFecha(ev.fecha)}
                    </p>
                  </div>
                </m.div>
              ))}

              {eventos.length > visibleEventsCount && (
                <button
                  onClick={() => setVisibleEventsCount((prev) => prev + 5)}
                  className="w-full text-center text-xs font-bold text-primary py-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors mt-2"
                >
                  Cargar eventos anteriores ({eventos.length - visibleEventsCount} más)
                </button>
              )}
            </div>
          )}
        </m.div>

        {/* Push Notification Opt-In */}
        {!yaTienePermiso && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground mb-1">Activar Notificaciones</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Recibe alertas en tu dispositivo de forma automática cada vez que este caso avance
                  de estado.
                </p>
              </div>
              <button
                onClick={() => requestNotificationPermission(caseData.shortId)}
                disabled={isHandlingPermission}
                className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
              >
                {isHandlingPermission ? 'Activando...' : 'Activar ahora'}
              </button>
            </div>
          </m.div>
        )}

        {/* QR de Seguimiento */}
        {windowUrl && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-6 bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm"
          >
            {/* QR oculto de alta resolución para la descarga (320px) */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <QRCode
                id="qr-cliente-hd"
                value={windowUrl}
                size={320}
                bgColor="#ffffff"
                fgColor="#111827"
                qrStyle="squares"
                eyeRadius={12}
                logoImage="/icon.png"
                logoWidth={90}
                logoHeight={90}
                logoPadding={5}
                logoPaddingStyle="square"
                removeQrCodeBehindLogo={true}
                ecLevel="H"
              />
            </div>

            {/* QR de visualización para el UI (100px) */}
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0 flex items-center justify-center">
              <QRCode
                value={windowUrl}
                size={100}
                bgColor="#ffffff"
                fgColor="#111827"
                qrStyle="squares"
                eyeRadius={4}
                logoImage="/icon.png"
                logoWidth={28}
                logoHeight={28}
                logoPadding={2}
                logoPaddingStyle="square"
                removeQrCodeBehindLogo={true}
                ecLevel="H"
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Código de Seguimiento QR</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Guarda este código QR o tómale una captura de pantalla. Al escanearlo volverás
                directamente a esta página para ver las actualizaciones de tu expediente.
              </p>
              <button
                onClick={() => {
                  const qrCanvas = document.getElementById('qr-cliente-hd') as HTMLCanvasElement;
                  if (!qrCanvas) {
                    toast({
                      title: 'Error',
                      description: 'Por favor, espera a que el QR termine de procesarse.',
                    });
                    return;
                  }

                  const PADDING = 24;
                  const QR_SIZE = 320;
                  const HEADER_H = 52;
                  const FOOTER_H = 36;
                  const TOTAL_W = QR_SIZE + PADDING * 2;
                  const TOTAL_H = QR_SIZE + HEADER_H + FOOTER_H + PADDING * 2;

                  const out = document.createElement('canvas');
                  out.width = TOTAL_W;
                  out.height = TOTAL_H;
                  const ctx = out.getContext('2d')!;

                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

                  ctx.fillStyle = '#F5A800';
                  ctx.fillRect(0, 0, TOTAL_W, HEADER_H);

                  ctx.fillStyle = '#000000';
                  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('DESMULTA', TOTAL_W / 2, HEADER_H / 2);

                  ctx.drawImage(qrCanvas, PADDING, HEADER_H + PADDING, QR_SIZE, QR_SIZE);

                  ctx.fillStyle = '#6b7280';
                  ctx.font = '13px system-ui, -apple-system, sans-serif';
                  ctx.textBaseline = 'top';
                  ctx.fillText(
                    'Mi expediente · desmulta.online',
                    TOTAL_W / 2,
                    HEADER_H + PADDING + QR_SIZE + 10
                  );

                  ctx.fillStyle = '#9ca3af';
                  ctx.font = '11px system-ui, -apple-system, sans-serif';
                  ctx.fillText(
                    'Escanea para ver el estado en tiempo real',
                    TOTAL_W / 2,
                    TOTAL_H - 16
                  );

                  out.toBlob((blob) => {
                    if (!blob) return;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `QR_MiExpediente_Desmulta.png`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }, 'image/png');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-primary/10 hover:bg-primary/20 border border-primary/30
                  text-primary text-xs font-bold transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Guardar QR
              </button>
            </div>
          </m.div>
        )}

        {/* Seguridad */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4 mb-8"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>Tus datos están cifrados. Esta página solo es accesible con tu enlace único.</span>
        </m.div>

        {/* Volver */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/estado"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-semibold transition-all"
          >
            <Shield className="w-4 h-4" />
            Consultar otro expediente
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <StoryProgressModal
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        caseData={caseData}
        currentStep={currentStep}
      />
    </div>
  );
}
