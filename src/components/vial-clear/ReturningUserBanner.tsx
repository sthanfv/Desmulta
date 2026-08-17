'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, ShieldCheck, History } from 'lucide-react';
import Link from 'next/link';
import { TrackingVerificationModal } from './TrackingVerificationModal';
import { getExpedienteCacheado } from '@/app/actions/tracking';

export function ReturningUserBanner() {
  const [show, setShow] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);

  useEffect(() => {
    // 🛡️ FIX HALLAZGO #1: Leer de sessionStorage (fuente actual) con fallback a localStorage (legado)
    const token =
      sessionStorage.getItem('desmulta_client_token') ||
      localStorage.getItem('desmulta_client_token');
    const caseId =
      sessionStorage.getItem('desmulta_active_case') ||
      localStorage.getItem('desmulta_active_case');

    if (token) {
      if (caseId) {
        if (caseId.length > 15) {
          // Es un ID antiguo de Firestore (Legacy). Limpiamos para evitar 404.
          sessionStorage.removeItem('desmulta_active_case');
          localStorage.removeItem('desmulta_active_case');
        } else {
          setActiveCaseId(caseId);
          // Fetch background status
          getExpedienteCacheado(caseId)
            .then((data) => {
              if (data && data.status) {
                setCaseStatus(data.status);
              }
            })
            .catch(() => {});
        }
      }

      // Pequeño delay para que la transición sea elegante tras cargar la página
      const t = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show || !isVisible) return null;

  return (
    <>
      <div className="w-full max-w-4xl mt-6 animate-in fade-in slide-in-from-top-4 duration-1000 relative z-[60]">
        <div className="relative overflow-hidden bg-white/40 dark:bg-black/40 border border-primary/20 backdrop-blur-2xl p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl group transition-all">
          {/* Destellos de fondo */}
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/10 rounded-full blur-[40px] sm:blur-[50px] -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/10 rounded-full blur-[30px] sm:blur-[40px] -ml-10 -mb-10 sm:-ml-12 sm:-mb-12" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 relative z-10">
            {/* Header del Banner */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0 mt-1 sm:mt-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5 flex-1 pr-6 sm:pr-0">
                <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider flex flex-wrap items-center gap-2">
                  Bienvenido de nuevo
                  <span className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20 shadow-sm">
                    <ShieldCheck className="w-2.5 h-2.5" /> RECONOCIDO
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">
                  Nuestro sistema reconoce tu actividad previa. Ya no necesitas llenar todo de nuevo
                  para consultar tu estado.
                </p>
                <div className="pt-2 sm:pt-3 flex flex-wrap gap-2">
                  {activeCaseId && (
                    <Link
                      href={`/seguir/${activeCaseId}`}
                      className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-green-500/20 transition-all active:scale-95 group/btn shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform duration-500" />
                      {caseStatus ? `Estado: ${caseStatus}` : 'Ver Caso Activo'}
                    </Link>
                  )}
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-primary/20 transition-all active:scale-95 group/btn shadow-sm"
                  >
                    <History className="w-3.5 h-3.5 group-hover/btn:-rotate-45 transition-transform duration-500" />
                    Ver Historial de Casos
                  </button>

                  <button
                    onClick={() => {
                      const calcSection = document.getElementById('calculadora');
                      if (calcSection) {
                        calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => {
                          calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 800);
                      } else {
                        // Si no tiene ID directo, buscamos por selector o simplemente scroll
                        window.scrollTo({
                          top: document.body.scrollHeight * 0.6,
                          behavior: 'smooth',
                        });
                      }
                    }}
                    className="flex items-center gap-2 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-blue-500/20 transition-all active:scale-95 group/btn shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Calculadora Legal
                  </button>
                </div>
              </div>
            </div>

            {/* Botón de cierre - Posicionamiento absoluto en móviles, relativo en desktop */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-muted-foreground hover:text-foreground transition-all active:scale-90 shrink-0"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {showHistoryModal && <TrackingVerificationModal onClose={() => setShowHistoryModal(false)} />}
    </>
  );
}
