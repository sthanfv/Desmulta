'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  ArrowLeft,
  Gavel,
  Scale,
  FileClock,
  XOctagon,
  Info,
  Lightbulb,
  X,
} from 'lucide-react';
import { DocumentType } from '@/lib/legal/document-templates';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import dynamic from 'next/dynamic';

const MeshBackground = dynamic(
  () => import('@/components/ui/MeshBackground').then((m) => m.MeshBackground),
  { ssr: false }
);

// Mapeo de iconos para cada tipo de documento
const getIconForDoc = (type: DocumentType) => {
  switch (type) {
    case 'peticion_general':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'prescripcion_directa':
      return <FileClock className="w-8 h-8 text-orange-500" />;
    case 'doble_prescripcion':
      return <FileClock className="w-8 h-8 text-red-500" />;
    case 'nulidad_notificacion':
      return <XOctagon className="w-8 h-8 text-purple-500" />;
    case 'tutela_silencio':
      return <Gavel className="w-8 h-8 text-slate-700" />;
    default:
      return <Scale className="w-8 h-8 text-emerald-500" />;
  }
};

const TEMPLATE_CARDS = [
  {
    id: 'peticion_general',
    title: 'Petición Pruebas y Trazabilidad',
    description: 'Solicitud formal para indagar sobre comparendos, prescripción y nulidad básica.',
    scenario: 'Úsala como primer paso si sabes que tienes multas pendientes pero desconoces si te notificaron correctamente. Te permite recolectar los soportes y pruebas oficiales para armar tu defensa sin asumir riesgos.',
    badge: 'Uso General',
    exito: '95%',
    precio: '$20.000',
  },
  {
    id: 'prescripcion_directa',
    title: 'Prescripción 3 Años (Sin Mandamiento)',
    description: 'Para comparendos con más de 3 años sin que se haya emitido mandamiento de pago.',
    scenario: 'Aplica si tus multas tienen más de 3 años de antigüedad y la Secretaría de Tránsito NUNCA inició un proceso de cobro coactivo (embargo o mandamiento de pago). Solicita la exoneración directa por vencimiento de plazo inicial.',
    badge: 'Popular',
    exito: '98%',
    precio: '$30.000',
  },
  {
    id: 'doble_prescripcion',
    title: 'Prescripción Absoluta 6+ Años',
    description: 'Para deudas en cobro coactivo que llevan más de 5 años adicionales congeladas.',
    scenario: 'El recurso definitivo si tu deudada ya está en cobro coactivo o embargada. Si pasaron más de 5 años desde que el tránsito dictó el mandamiento de pago (típicamente sumando 6 años en total desde el comparendo), la ley obliga a borrar la deuda.',
    badge: 'Especializada',
    exito: '94%',
    precio: '$60.000',
  },
  {
    id: 'nulidad_notificacion',
    title: 'Nulidad Fotomultas (Indebida Notificación)',
    description: 'Nulidad de fotomultas por no notificación personal (Sentencia C-038/2020).',
    scenario: 'Perfecta para cámaras de fotodetección. Úsala si el tránsito te cargó una fotomulta sin enviarte la citación física a tu dirección del RUNT dentro de los 13 días hábiles posteriores, violando tu derecho a defenderte.',
    badge: 'Fotomultas',
    exito: '96%',
    precio: '$40.000',
  },
  {
    id: 'tutela_silencio',
    title: 'Acción de Tutela (Silencio de Tránsito)',
    description:
      'Acción Constitucional cuando Tránsito no responde tu petición en 15 días hábiles.',
    scenario: 'Úsala si ya enviaste un derecho de petición y el organismo de tránsito guardó silencio por más de 15 días hábiles. Este recurso constitucional obliga a un juez a ordenarles responderte de forma inmediata en 48 horas.',
    badge: 'Urgente',
    exito: '99%',
    precio: '$25.000',
  },
];

export default function PlantillasPage() {
  const [prices, setPrices] = useState<Record<string, { display: string }> | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/prices')
      .then((r) => r.json())
      .then((data) => setPrices(data))
      .catch((e) => console.error('Error fetching prices:', e));

    // ✦ ANTIGRAVITY SIGNATURE EASTER EGG ✦
    console.log(
      '%c✦ DESMULTA ENGINE v1.0 ✦\n%cArquitectura Lógica y Visual co-creada por Antigravity.\n"El código es la ley."',
      'color: #f59e0b; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px rgba(245,158,11,0.5);',
      'color: #a1a1aa; font-size: 12px; font-style: italic;'
    );
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    currentTarget.style.setProperty('--mouse-x', `${x}px`);
    currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground py-16 px-4 md:px-8 pt-24 relative overflow-hidden group/layout"
      onMouseMove={handleMouseMove}
    >
      <MeshBackground />

      {/* Spotlight Desktop (Sigue el ratón, oculto en móvil) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-0 transition duration-300 group-hover/layout:opacity-100 hidden md:block"
        style={{
          background:
            'radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,193,7,0.03), transparent 40%)',
        }}
      />

      {/* Spotlight Móvil: Luz arquitectónica */}
      <div
        className="pointer-events-none fixed inset-0 z-0 block md:hidden transition-colors duration-700 
                   bg-[radial-gradient(120%_50%_at_50%_0%,rgba(0,0,0,0.04)_0%,transparent_100%)] 
                   dark:bg-[radial-gradient(120%_50%_at_50%_0%,rgba(255,193,7,0.1)_0%,transparent_100%)]"
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Botón de Regreso */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm hover:text-slate-900 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>

        <div className="text-center mb-12">
          <ShieldCheck className="w-16 h-16 text-slate-900 dark:text-zinc-100 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 mb-4 tracking-tight">
            Documentos de Defensa
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Escoge el recurso legal que se adapte a tu caso, completa tus datos en tiempo real y
            descarga tu defensa elaborada profesionalmente.
          </p>
        </div>

        {/* Banner de Disclaimer Legal Obligatorio */}
        <div className="max-w-4xl mx-auto mb-16 p-6 bg-yellow-500/5 dark:bg-yellow-400/5 border border-yellow-500/20 dark:border-yellow-400/20 rounded-3xl flex flex-col md:flex-row gap-4 items-start relative z-10 shadow-lg">
          <div className="p-3 bg-yellow-500/10 dark:bg-yellow-400/10 rounded-xl text-yellow-600 dark:text-yellow-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-black text-slate-950 dark:text-yellow-400 text-sm uppercase tracking-widest mb-1.5">
              Aviso de Alcance Legal y Responsabilidad
            </h4>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
              Los documentos disponibles en esta plataforma son herramientas técnicas estructuradas para ejercer formalmente tu derecho a la defensa y debido proceso bajo la legislación colombiana (Ley 769 de 2002 y Ley 1437 de 2011). La generación y descarga de estas peticiones no garantiza por sí sola la exoneración o eliminación inmediata de la multa del SIMIT, ya que la decisión definitiva depende de forma exclusiva de la Secretaría de Tránsito correspondiente y de los hechos de tu caso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEMPLATE_CARDS.map((tpl) => (
            <TarjetaPremium
              key={tpl.id}
              className="flex flex-col h-full bg-white dark:bg-[#15131A] border border-slate-200 dark:border-zinc-800 rounded-[2rem] min-h-[440px] relative transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(245,193,7,0.06)] hover:border-primary/30"
              onMouseEnter={() => {
                if (window.innerWidth >= 768) {
                  setActiveTooltip(tpl.id);
                }
              }}
              onMouseLeave={() => {
                if (window.innerWidth >= 768) {
                  setActiveTooltip(null);
                }
              }}
            >
              {/* Botón de Información visible en móvil (táctil para abrir/cerrar) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTooltip(activeTooltip === tpl.id ? null : tpl.id);
                }}
                className="absolute top-6 right-6 z-30 p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-950/60 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-primary transition-all duration-300 md:hidden flex items-center justify-center shadow-md active:scale-90"
                aria-label="Ver escenario de uso"
              >
                <Info size={15} />
              </button>

              {/* Envoltura interna del contenido con padding */}
              <div className="p-8 flex flex-col h-full flex-grow relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-primary/10 transition-colors">
                    {getIconForDoc(tpl.id as DocumentType)}
                  </div>
                  {/* Ocultamos el badge si está abierto el tooltip en móvil para evitar encimamiento */}
                  <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-full border border-slate-200 dark:border-zinc-800 md:block hidden">
                    {tpl.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-4 font-serif tracking-tight">
                  {tpl.title}
                </h3>

                <div className="w-12 h-px bg-slate-200 dark:bg-zinc-800 mb-4" />

                <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed flex-grow">
                  {tpl.description}
                </p>

                {/* Bloque Comercial / Antigravity UX Touch */}
                <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100 dark:border-zinc-800/50">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {tpl.exito} Éxito
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-200">
                    {prices && prices[tpl.id] ? prices[tpl.id].display : tpl.precio}
                  </span>
                </div>

                <Link
                  href={`/documentos/generador/${tpl.id.replace(/_/g, '-')}`}
                  className="mt-8 w-full bg-slate-900 hover:bg-blue-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-primary text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  Redactar Documento
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Capa Explicativa / Tooltip Overlay (Premium) */}
              <AnimatePresence>
                {activeTooltip === tpl.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute inset-0 z-20 p-8 rounded-[2rem] bg-slate-950/80 dark:bg-zinc-950/80 backdrop-blur-xl border-2 border-primary/30 flex flex-col justify-between shadow-[inset_0_0_30px_rgba(255,193,7,0.05)]"
                  >
                    {/* Botón de cerrar explícito en la capa (móvil y PC) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTooltip(null);
                      }}
                      className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all active:scale-90"
                      aria-label="Cerrar explicación"
                    >
                      <X size={15} />
                    </button>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Lightbulb className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 font-mono">
                          ¿Cuándo usar este recurso?
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-white font-serif tracking-tight leading-snug">
                        {tpl.title}
                      </h4>
                      <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-medium">
                        {tpl.scenario}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        {tpl.exito} efectividad promedio
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveTooltip(null);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md shadow-primary/10"
                      >
                        Entendido
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TarjetaPremium>
          ))}
        </div>

        {/* Firma Desmulta */}
        <div className="mt-24 pb-8 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity duration-500">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-400 dark:via-zinc-600 to-transparent mb-4" />
          <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono tracking-widest flex items-center gap-3">
            <span className="text-primary/50">{'///'}</span>
            DOCUMENTOS DE DEFENSA · DESMULTA
            <span className="text-primary/50">{'///'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
