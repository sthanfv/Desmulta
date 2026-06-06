import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, BookOpen, AlertTriangle, Scale } from 'lucide-react';
import ciudadesData from '@/lib/data/ciudades.json';
import infraccionesData from '@/lib/data/infracciones.json';

export const revalidate = 2592000; // 30 días — el contenido legal cambia muy poco

type Props = {
  params: Promise<{
    ciudad: string;
    infraccion: string;
  }>;
};

export function generateStaticParams() {
  const paths: { ciudad: string; infraccion: string }[] = [];

  ciudadesData.forEach((ciudad) => {
    infraccionesData.forEach((infraccion) => {
      paths.push({
        ciudad: ciudad.slug,
        infraccion: infraccion.slug,
      });
    });
  });

  return paths;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);
  const infraccion = infraccionesData.find((i) => i.slug === params.infraccion);

  if (!ciudad || !infraccion) {
    return { title: 'No encontrado' };
  }

  return {
    title: `${infraccion.titulo_seo} en ${ciudad.nombre} | Desmulta`,
    description: `¿Recibiste un comparendo por ${infraccion.nombre.toLowerCase()} en ${ciudad.nombre}? Descubre cómo la ${ciudad.entidadTransito} debe cumplir la ley y cómo puedes impugnar.`,
    keywords: `${infraccion.slug} ${ciudad.nombre}, impugnar ${infraccion.nombre.toLowerCase()} ${ciudad.nombre}, tránsito ${ciudad.nombre}`,
  };
}

export default async function MultaEspecificaPage(props: Props) {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);
  const infraccion = infraccionesData.find((i) => i.slug === params.infraccion);

  if (!ciudad || !infraccion) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-500/30 selection:text-white">
      {/* Breadcrumbs */}
      <div className="pt-24 px-6 md:px-12 max-w-4xl mx-auto flex items-center gap-2 text-sm text-white/50">
        <Link href="/" className="hover:text-white transition-colors">
          Inicio
        </Link>
        <span>/</span>
        <Link
          href={`/multas/${ciudad.slug}`}
          className="hover:text-white transition-colors capitalize"
        >
          {ciudad.nombre}
        </Link>
        <span>/</span>
        <span className="text-brand-400 font-medium">{infraccion.nombre}</span>
      </div>

      {/* Hero Section */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 mb-8 border border-brand-500/20">
            <AlertTriangle size={32} className="text-brand-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
            {infraccion.titulo_seo} en <span className="text-brand-400">{ciudad.nombre}</span>
          </h1>
          <p className="text-xl text-white/70 leading-relaxed">
            {infraccion.descripcion_seo} Las notificaciones enviadas por la{' '}
            <strong>{ciudad.entidadTransito}</strong> a menudo contienen errores de procedimiento
            que permiten la caducidad del cobro.
          </p>
        </div>
      </section>

      {/* Contexto Legal */}
      <section className="py-16 px-6 md:px-12 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-6 bg-black/40 p-8 rounded-[2rem] border border-white/5">
            <div className="shrink-0 p-4 bg-white/5 rounded-2xl">
              <BookOpen size={28} className="text-white/80" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">El Error de la Secretaría de Tránsito</h2>
              <p className="text-white/70 leading-relaxed mb-6">{infraccion.contexto_legal}</p>
              <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl text-sm text-brand-300 font-medium flex items-center gap-3">
                <ShieldCheck size={20} className="shrink-0" />
                <span>
                  Analizamos tu expediente específico en {ciudad.departamento} para validar si
                  aplican estos vicios legales.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <Scale size={48} className="text-white/20 mx-auto mb-8" />
          <h2 className="text-3xl font-bold mb-6">Inicia tu defensa ahora mismo</h2>
          <p className="text-white/60 mb-10 text-lg">
            Sube el pantallazo del SIMIT. Nuestro escáner heurístico verificará en segundos si la
            multa por {infraccion.nombre} en {ciudad.nombre} es legalmente exigible.
          </p>
          <Link
            href="/#escaner"
            className="inline-flex px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-lg transition-all active:scale-95 items-center justify-center gap-2"
          >
            Escanear Multa Gratis <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
