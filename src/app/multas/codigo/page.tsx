import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, BookOpen } from 'lucide-react';
import codigosInfraccionData from '@/lib/data/codigos-infraccion.json';

export const metadata: Metadata = {
  title: 'Directorio de Códigos de Multa | Desmulta',
  description: 'Conoce el significado, valor y opciones de defensa para todos los códigos de infracción de tránsito en Colombia. Consulta si tu comparendo es impugnable.',
  keywords: 'codigos infraccion transito colombia, significado codigos multas, directorio comparendos simit',
};

export default function DirectorioCodigosPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-500/30 selection:text-white relative overflow-hidden pb-20">
      {/* Header flotante */}
      <header className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-7xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10 bg-black/40 backdrop-blur-md">
          <Link
            href="/#contacto"
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-white font-mono hidden sm:inline">
              Defensa Legal
            </span>
          </div>
        </div>
      </header>

      {/* Fondo */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.06)_0%,transparent_50%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-12 px-6 md:px-12 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-primary/10 mb-8 border border-primary/20 shadow-inner">
            <BookOpen size={30} className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight uppercase">
            Directorio Nacional de <br className="hidden sm:inline" />
            <span className="text-primary">Códigos de Infracción</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium max-w-2xl mx-auto">
            Explora nuestra biblioteca legal. Conoce el significado, valor de sanción y nuestras estrategias técnicas de defensa para cada código de multa establecido en el Código Nacional de Tránsito.
          </p>
        </div>
      </section>

      {/* Grid de Códigos */}
      <section className="relative z-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {codigosInfraccionData.map((infraccion) => (
              <Link
                key={infraccion.codigo}
                href={`/multas/codigo/${infraccion.codigo}`}
                className="group flex flex-col p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/30 transition-all active:scale-95"
                title={`Cómo impugnar el comparendo código ${infraccion.codigo} - ${infraccion.nombre}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-lg font-black text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors">
                    {infraccion.codigo}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-primary transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                  {infraccion.nombre}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
