'use client';

import React, { useState } from 'react';
import { ShieldCheck, History, Loader2, AlertCircle, ClipboardList, FileText } from 'lucide-react';
import { getConsultationActivity } from '@/app/actions/user-activity.actions';

/**
 * TrackingVerificationModal — Desmulta v8.5.0
 *
 * CORRECCIÓN ARQUITECTURAL v8.5.0:
 * Antes usaba Firebase Anonymous Auth (auth.currentUser) para obtener un ID Token,
 * luego el servidor buscaba por UID anónimo — que cambia en cada sesión nueva.
 * RESULTADO: el modal siempre aparecía vacío en visitas de retorno.
 *
 * SOLUCIÓN: El usuario ingresa su cédula. Se envía directamente a la Server Action.
 * El servidor la hashea con SHA-256 (Zero-PII) y busca por ese hash estable.
 * Elimina la dependencia de Firebase Auth anónimo para este flujo.
 */
export function TrackingVerificationModal({ onClose }: { onClose: () => void }) {
  const [cedula, setCedula] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<{
    totalDeuda: number;
    conteoCasos: number;
    conteoConsultas: number;
    casosActivos: { id: string; referencia: string; status: string }[];
    consultasRecientes: { id: string; shortId: string; status: string; monto: number }[];
    tieneDatos: boolean;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cedula.length < 5) {
      setError('Ingresa un número de cédula válido.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Enviamos la cédula directamente — el servidor la hashea (Zero-PII en tránsito HTTPS)
      const result = await getConsultationActivity(cedula);

      if (result.success) {
        setActivityData(result.data as typeof activityData);
      } else {
        setError(result.error || 'No se pudo recuperar la información.');
      }
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Vista: Resultados ─────────────────────────────────────────────────────
  if (activityData) {
    const sinActividad = !activityData.tieneDatos;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200">
        <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          {/* Cabecera */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
              <History className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              Tu Historial Desmulta
            </h2>
            <p className="text-white/40 text-sm font-medium">
              Resumen consolidado de tu actividad legal
            </p>
          </div>

          {/* Sin datos: usuario nuevo o cédula sin consultas previas */}
          {sinActividad ? (
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center space-y-3">
              <FileText className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-sm font-bold text-white/50">
                No encontramos consultas previas asociadas a esta cédula.
              </p>
              <p className="text-xs text-white/30 leading-relaxed">
                Si eres nuevo, inicia tu estudio gratuito desde el botón principal.
              </p>
            </div>
          ) : (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Deuda Total</p>
                  <p className="text-xl font-black text-white">
                    ${(activityData.totalDeuda || 0).toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">Consultas</p>
                  <p className="text-xl font-black text-white">{activityData.conteoConsultas}</p>
                </div>
              </div>

              {/* Trámites activos */}
              {activityData.casosActivos && activityData.casosActivos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2">
                    <ClipboardList className="w-3 h-3" /> Estado de tus trámites
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {activityData.casosActivos.map(
                      (caso: { id: string; referencia: string; status: string }) => (
                        <div
                          key={caso.id}
                          className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between"
                        >
                          <span className="text-[10px] font-bold text-white/60">
                            {caso.referencia || 'Expediente'}
                          </span>
                          <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase">
                            {caso.status || 'En Proceso'}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Consultas recientes */}
              {activityData.consultasRecientes && activityData.consultasRecientes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">
                    Consultas recientes
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {activityData.consultasRecientes.map((consulta) => (
                      <div
                        key={consulta.id}
                        className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between"
                      >
                        <span className="text-[10px] font-bold text-white/60">
                          {consulta.shortId}
                        </span>
                        <span
                          className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                            consulta.status === 'exitoso'
                              ? 'bg-green-500/20 text-green-400'
                              : consulta.status === 'pendiente'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {consulta.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-colors active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // ── Vista: Formulario de verificación ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Verificar Identidad
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Ingresa tu número de cédula para consultar tu historial de casos en Desmulta.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="Número de Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
            maxLength={12}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-bold focus:outline-none focus:border-primary transition-colors text-center text-lg tracking-[0.2em]"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 border border-white/10 text-white/40 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isVerifying || cedula.length < 5}
              className="flex-[2] bg-primary text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONSULTAR HISTORIAL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
