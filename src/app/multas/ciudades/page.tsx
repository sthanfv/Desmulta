import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, MapPin } from 'lucide-react';
import colombiaCities from '@/lib/data/ciudades.json';

export const metadata: Metadata = {
  title: 'Directorio de Cobertura Nacional por Ciudad | Desmulta',
  description: 'Conoce todas las ciudades y municipios en Colombia donde ofrecemos cobertura legal para defensa de multas y fotomultas de tránsito.',
  keywords: 'cobertura nacional desmulta, impugnar fotomultas ciudades colombia, secretarias de transito colombia',
};

export default function DirectorioCiudadesPage() {
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
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_50%_-20%,rgba(34,197,94,0.06)_0%,transparent_50%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-12 px-6 md:px-12 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-green-500/10 mb-8 border border-green-500/20 shadow-inner">
            <MapPin size={30} className="text-green-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight uppercase">
            Directorio de <br className="hidden sm:inline" />
            <span className="text-green-500">Cobertura Nacional</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium max-w-2xl mx-auto">
            Ofrecemos representación legal y técnica en todo el territorio colombiano. Selecciona tu ciudad o municipio para conocer cómo te protegemos ante la Secretaría de Tránsito local.
          </p>
        </div>
      </section>

      {/* Grid de Ciudades */}
      <section className="relative z-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {colombiaCities.map((city) => (
              <Link
                key={city.slug}
                href={`/multas/${city.slug}`}
                className="group flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-green-500/30 transition-all active:scale-95"
                title={`Impugnar multas y fotomultas en ${city.nombre}`}
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-green-500/20 transition-colors shrink-0">
                  <MapPin size={14} className="text-muted-foreground group-hover:text-green-500 transition-colors" />
                </div>
                <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">
                  {city.nombre}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
