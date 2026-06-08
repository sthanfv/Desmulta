/**
 * Página 451 — Servicio No Disponible en tu Región
 *
 * Se muestra cuando el middleware detecta una IP de un país
 * diferente a Colombia (CO). El código HTTP 451 es el estándar
 * para contenido bloqueado por razones legales/geográficas.
 *
 * MANDATO-FILTRO v8.12.0 — Geobloqueo suave: no hostil, informativo.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Servicio No Disponible en tu Región | Desmulta',
  description: 'Desmulta es un servicio exclusivo para Colombia.',
  robots: { index: false, follow: false },
};

export default function GeoBloqueadoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Bandera Colombia */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-16 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex-1 bg-yellow-400" />
            <div className="flex-[0.5] bg-blue-700" />
            <div className="flex-[0.5] bg-red-700" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
          Servicio Regional
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
          Solo disponible en{' '}
          <span className="text-amber-400">Colombia 🇨🇴</span>
        </h1>

        <p className="text-white/60 text-base leading-relaxed mb-8">
          Desmulta es una plataforma especializada en la legislación de tránsito colombiana.
          Nuestros servicios, análisis y defensa están diseñados exclusivamente para ciudadanos
          y residentes en Colombia.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <p className="text-white/40 text-sm font-mono">
            HTTP 451 — Unavailable For Legal Reasons
          </p>
          <p className="text-white/30 text-xs mt-1">
            Tu IP fue detectada fuera de Colombia
          </p>
        </div>

        <p className="text-white/30 text-xs">
          ¿Estás en Colombia y ves este mensaje?{' '}
          <span className="text-amber-400">
            Es posible que estés usando una VPN. Desactívala e intenta de nuevo.
          </span>
        </p>
      </div>
    </main>
  );
}
