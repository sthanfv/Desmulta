import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import ciudadesData from '@/lib/data/ciudades.json';

export const metadata: Metadata = {
  title: 'Directorio Nacional de Multas e Infracciones | Desmulta',
  description:
    'Selecciona tu ciudad para conocer las estrategias de defensa legal contra fotomultas, SOAT, pico y placa, embargos y comparendos de tránsito.',
  keywords: 'multas colombia, impugnar fotomultas, secretarías de tránsito colombia',
};

export default function DirectorioMultasPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-500/30 selection:text-white pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 md:px-12 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-black pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 mb-8 border border-brand-500/20">
            <ShieldCheck size={32} className="text-brand-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
            Directorio Nacional de Tránsito
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Las leyes de tránsito son nacionales, pero las secretarías operan a nivel local.
            Selecciona tu ciudad para conocer cómo impugnar legalmente según la jurisdicción.
          </p>
        </div>
      </section>

      {/* Grid de Ciudades */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ciudadesData.map((ciudad) => (
            <Link
              key={ciudad.slug}
              href={`/multas/${ciudad.slug}`}
              className="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-brand-500/50 hover:bg-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <MapPin size={18} className="text-brand-400" />
                  </div>
                  <ArrowRight
                    size={20}
                    className="text-white/20 group-hover:text-brand-500 group-hover:-rotate-45 transition-all"
                  />
                </div>
                <h2 className="text-xl font-bold mb-1 group-hover:text-brand-400 transition-colors">
                  {ciudad.nombre}
                </h2>
                <p className="text-sm text-white/50 uppercase tracking-widest font-semibold">
                  {ciudad.departamento}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
