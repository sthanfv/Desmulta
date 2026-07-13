'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  ArrowLeft,
  Gavel,
  Scale,
  FileClock,
  XOctagon,
} from 'lucide-react';
import { DOCUMENT_TEMPLATES, DocumentType } from '@/lib/legal/document-templates';
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
    badge: 'Uso General',
    exito: '95%',
    precio: '$14.900',
  },
  {
    id: 'prescripcion_directa',
    title: 'Prescripción 3 Años (Sin Mandamiento)',
    description: 'Para comparendos con más de 3 años sin que se haya emitido mandamiento de pago.',
    badge: 'Popular',
    exito: '98%',
    precio: '$24.900',
  },
  {
    id: 'doble_prescripcion',
    title: 'Prescripción Absoluta 6+ Años',
    description: 'Para deudas en cobro coactivo que llevan más de 5 años adicionales congeladas.',
    badge: 'Especializada',
    exito: '94%',
    precio: '$34.900',
  },
  {
    id: 'nulidad_notificacion',
    title: 'Nulidad Fotomultas (Indebida Notificación)',
    description: 'Nulidad de fotomultas por no notificación personal (Sentencia C-038/2020).',
    badge: 'Fotomultas',
    exito: '96%',
    precio: '$29.900',
  },
  {
    id: 'tutela_silencio',
    title: 'Acción de Tutela (Silencio de Tránsito)',
    description:
      'Acción Constitucional cuando Tránsito no responde tu petición en 15 días hábiles.',
    badge: 'Urgente',
    exito: '99%',
    precio: '$19.900',
  },
];

export default function PlantillasPage() {
  useEffect(() => {
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

        <div className="text-center mb-16">
          <ShieldCheck className="w-16 h-16 text-slate-900 dark:text-zinc-100 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 mb-4 tracking-tight">
            Documentos de Defensa
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Escoge el recurso legal que se adapte a tu caso, completa tus datos en tiempo real y
            descarga tu defensa elaborada profesionalmente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEMPLATE_CARDS.map((tpl) => (
            <TarjetaPremium
              key={tpl.id}
              className="p-8 flex flex-col h-full bg-white dark:bg-[#15131A] border border-slate-200 dark:border-zinc-800 rounded-[2rem] min-h-[420px]"
            >
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-primary/10 transition-colors">
                  {getIconForDoc(tpl.id as DocumentType)}
                </div>
                <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-full border border-slate-200 dark:border-zinc-800">
                  {tpl.badge}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-4 relative z-10 font-serif tracking-tight">
                {tpl.title}
              </h3>

              <div className="w-12 h-px bg-slate-200 dark:bg-zinc-800 mb-4" />

              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed flex-grow relative z-10">
                {tpl.description}
              </p>

              {/* Bloque Comercial / Antigravity UX Touch */}
              <div className="mt-6 flex justify-between items-center relative z-10 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
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
                  {tpl.precio}
                </span>
              </div>

              <Link
                href={`/documentos/generador/${tpl.id.replace(/_/g, '-')}`}
                className="mt-8 w-full bg-slate-900 hover:bg-blue-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-primary text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors relative z-10"
              >
                Redactar Documento
                <ArrowRight className="w-4 h-4" />
              </Link>
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
