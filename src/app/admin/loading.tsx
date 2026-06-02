import { ShieldCheck } from 'lucide-react';

export default function Loading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 bg-[#0F172A]">
      {/* Icono central con pulso suave */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-20 h-20 bg-[#FFC107]/20 rounded-full animate-ping" />
        <div className="relative bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl">
          <ShieldCheck className="w-10 h-10 text-[#FFC107] animate-pulse" />
        </div>
      </div>

      {/* Esqueleto de Tarjetas (Skeleton Loader) */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 overflow-hidden relative"
          >
            {/* Efecto de brillo (Shimmer) de izquierda a derecha */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/40 to-transparent" />

            <div className="w-full h-40 bg-slate-800/50 rounded-xl mb-4" />
            <div className="w-3/4 h-6 bg-slate-800/50 rounded-md mb-3" />
            <div className="w-full h-4 bg-slate-800/50 rounded-md mb-2" />
            <div className="w-5/6 h-4 bg-slate-800/50 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
