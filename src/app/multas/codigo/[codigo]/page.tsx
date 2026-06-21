import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Scale,
  DollarSign,
  CarFront,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import codigosInfraccionData from '@/lib/data/codigos-infraccion.json';

export const revalidate = 2592000; // Revalidar cada 30 días

type Props = {
  params: Promise<{
    codigo: string;
  }>;
};

// Generar rutas estáticas en tiempo de compilación (SSG)
export async function generateStaticParams() {
  return codigosInfraccionData.map((infraccion) => ({
    codigo: infraccion.codigo,
  }));
}

// Función para parsear texto con formato de negritas **texto** en elementos React estilizados
function parseBoldText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          className="text-white font-extrabold underline decoration-primary/30 underline-offset-2"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Generar metadatos SEO dinámicos
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const infraccion = codigosInfraccionData.find(
    (i) => i.codigo.toUpperCase() === params.codigo.toUpperCase()
  );

  if (!infraccion) {
    return { title: 'Infracción no encontrada | Desmulta' };
  }

  return {
    title: `${infraccion.titulo_seo} | Desmulta`,
    description: infraccion.descripcion_seo,
    keywords: `infraccion ${infraccion.codigo}, comparendo ${infraccion.codigo}, multa ${infraccion.codigo} transito, precio ${infraccion.codigo} 2026, apelar ${infraccion.codigo} colombia`,
  };
}

export default async function CodigoInfraccionPage(props: Props) {
  const params = await props.params;
  const infraccion = codigosInfraccionData.find(
    (i) => i.codigo.toUpperCase() === params.codigo.toUpperCase()
  );

  if (!infraccion) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-500/30 selection:text-white relative overflow-hidden">
      {/* Header flotante para navegación fácil */}
      <header className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10 bg-black/40 backdrop-blur-md">
          <Link
            href="/#contacto"
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-white font-mono">
              Código {infraccion.codigo}
            </span>
          </div>
        </div>
      </header>

      {/* Fondo con luces difusas premium */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.06)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute top-[400px] right-[-10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-12 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-primary/10 mb-8 border border-primary/20 shadow-inner">
            <ShieldAlert size={30} className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight uppercase">
            Infracción <span className="text-primary font-mono">{infraccion.codigo}</span>:{' '}
            <br className="hidden sm:inline" />
            <span className="text-white/95">{infraccion.nombre}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium">
            ¿Te impusieron una orden de comparendo con el código{' '}
            <strong className="text-primary font-mono">{infraccion.codigo}</strong>? Esta falta
            clasifica dentro del Código Nacional de Tránsito y cuenta con especificaciones de precio
            y viabilidad de apelación.
          </p>
        </div>
      </section>

      {/* Ficha Técnica / Spec Card */}
      <section className="relative z-10 py-6 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950/80 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-xl">
            {/* Gravedad */}
            <div className="flex items-center gap-4 p-3 border-b sm:border-b-0 sm:border-r border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Gravedad
                </p>
                <p className="text-sm font-black text-white">{infraccion.gravedad}</p>
              </div>
            </div>

            {/* Sanción COP */}
            <div className="flex items-center gap-4 p-3 border-b sm:border-b-0 sm:border-r border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Valor Sanción (2026)
                </p>
                <p className="text-sm font-black text-primary font-mono">
                  {infraccion.sancion_cop}
                </p>
              </div>
            </div>

            {/* Inmoviliza */}
            <div className="flex items-center gap-4 p-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${infraccion.inmoviliza ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}
              >
                <CarFront size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  ¿Da Inmovilización?
                </p>
                <p
                  className={`text-sm font-black ${infraccion.inmoviliza ? 'text-red-500' : 'text-emerald-500'}`}
                >
                  {infraccion.inmoviliza ? 'SÍ (Patio)' : 'NO'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contexto Legal / Vicio de Secretaría */}
      <section className="relative z-10 py-12 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
              <div className="shrink-0 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <BookOpen size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">
                  El Error de la Secretaría de Tránsito
                </h2>
                <p className="text-slate-300 leading-relaxed mb-6 font-medium">
                  {parseBoldText(infraccion.contexto_legal)}
                </p>

                <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary font-bold uppercase tracking-wider">
                  <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                  <span>Defensa clave: {parseBoldText(infraccion.defensa_clave)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 py-20 px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <Scale size={48} className="text-white/20 mx-auto mb-8 animate-pulse" />
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase mb-6">
            Inicia tu defensa gratis ahora mismo
          </h2>
          <p className="text-slate-400 mb-10 text-sm md:text-base leading-relaxed max-w-xl mx-auto font-medium">
            Sube la foto o captura de pantalla de tu comparendo del SIMIT. Nuestro lector
            inteligente analizará de inmediato si el comparendo{' '}
            <strong className="text-primary font-mono">{infraccion.codigo}</strong> cumple con las
            condiciones de ley para ser eliminado.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#escaner"
              className="w-full sm:w-auto inline-flex px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-primary to-amber-600 hover:from-amber-600 hover:to-primary text-black font-black text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(245,168,0,0.25)] hover:scale-[1.03] active:scale-95 items-center justify-center gap-2"
            >
              Escanear Multa Gratis <ArrowRight size={14} className="stroke-[2.5]" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-colors justify-center"
            >
              Ir al Inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
