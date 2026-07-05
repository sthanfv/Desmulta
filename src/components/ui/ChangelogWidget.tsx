'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { changelogHistory, getTagStyle, TAG_ICONS } from '@/lib/changelog';

/**
 * ChangelogWidget — Panel flotante de novedades.
 * MANDATO-FILTRO: Lenguaje ciudadano, estética premium, cero tecnicismos.
 *
 * 📌 GUÍA DE EDICIÓN:
 * - Este componente NO contiene datos. Los datos viven en `src/lib/changelog.ts`.
 * - Si quieres añadir una nueva versión, edita SOLO `changelog.ts`.
 * - Si quieres cambiar la estética (colores, animaciones), edita aquí.
 */
export function ChangelogWidget({ usePortal = false }: { usePortal?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    changelogHistory[0].version
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Soluciona hydration error en Next.js App Router para Portales
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleAccordion = (version: string) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  // Cierre al hacer click fuera del panel o de su portal
  // MANDATO-FILTRO v7.4.3: El listener SOLO se registra cuando isOpen === true.
  // Antes estaba activo siempre, interceptando toques globales en Android.
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        (!popoverRef.current || !popoverRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const renderContent = () => (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={
              usePortal
                ? 'fixed inset-x-4 top-32 w-auto max-w-sm max-h-[80vh] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-800/60 rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col mx-auto'
                : 'absolute right-0 mt-3 w-[360px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-800/60 rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col'
            }
          >
            {/* Cabecera del Panel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800/60 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-zinc-900/50 dark:to-zinc-900/30">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <span className="text-base">📋</span>
                  Novedades
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                  Desmulta v{changelogHistory[0].version}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
                aria-label="Cerrar panel de novedades"
              >
                ✕
              </button>
            </div>

            {/* Área de Acordeones con Scroll Estilizado */}
            <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-2.5">
              {changelogHistory.slice(0, 5).map((release, releaseIdx) => {
                const isExpanded = expandedVersion === release.version;

                return (
                  <m.div
                    key={release.version}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: releaseIdx * 0.05 }}
                    className="mb-1.5 rounded-xl border border-transparent hover:border-gray-200/70 dark:hover:border-zinc-700/40 transition-colors"
                  >
                    {/* Encabezado de Versión */}
                    <button
                      onClick={() => toggleAccordion(release.version)}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-gray-50/80 dark:hover:bg-zinc-800/30 transition-all group"
                    >
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                            v{release.version}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                            {release.date}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                          {release.title}
                        </span>
                      </div>
                      <span
                        className={`text-gray-300 dark:text-zinc-600 text-[10px] transition-transform duration-300 group-hover:text-gray-500 dark:group-hover:text-zinc-400 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Contenido del Acordeón */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <m.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pt-1 pb-3 space-y-2.5">
                            {release.changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-gray-50/60 dark:hover:bg-zinc-800/20 transition-colors"
                              >
                                {/* Tag con ícono y color */}
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${getTagStyle(change.tag)}`}
                                >
                                  <span className="text-[10px]">{TAG_ICONS[change.tag]}</span>
                                  {change.tag}
                                </span>
                                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-zinc-400">
                                  {change.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                );
              })}
            </div>

            {/* Pie del Panel */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-zinc-800/40 bg-gray-50/50 dark:bg-zinc-900/20">
              <p className="text-[9px] text-gray-400 dark:text-zinc-600 text-center font-medium tracking-wide">
                Mejoramos constantemente para proteger tus derechos
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* ─── Botón Trigger ─── */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-foreground/80 hover:text-primary hover:bg-primary/5 dark:text-zinc-400 dark:hover:text-primary dark:hover:bg-primary/10 rounded-xl transition-all duration-300"
        aria-label="Ver registro de cambios y novedades"
      >
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Novedades
      </button>

      {/* ─── Panel Desplegable Premium con Animación y Portal Fijo ─── */}
      {mounted &&
        (usePortal && typeof document !== 'undefined'
          ? createPortal(renderContent(), document.body)
          : renderContent())}
    </div>
  );
}
