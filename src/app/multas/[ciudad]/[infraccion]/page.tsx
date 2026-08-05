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
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-500/30 selection:text-primary-foreground">
      {/* Breadcrumbs */}
      <div className="pt-24 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-white/50 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-foreground transition-colors shrink-0">
          Inicio
        </Link>
        <span>/</span>
        <Link
          href={`/multas/${ciudad.slug}`}
          className="hover:text-foreground transition-colors capitalize shrink-0"
        >
          {ciudad.nombre}
        </Link>
        <span>/</span>
        <span className="text-brand-400 font-medium">{infraccion.nombre}</span>
      </div>

      {/* Hero Section */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 rounded-2xl bg-brand-500/10 mb-6 sm:mb-8 border border-brand-500/20">
            <AlertTriangle size={32} className="text-brand-500 w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 leading-tight">
            {infraccion.titulo_seo} en{' '}
            <span className="text-brand-500 dark:text-brand-400">{ciudad.nombre}</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-white/70 leading-relaxed">
            {infraccion.descripcion_seo} Las notificaciones enviadas por la{' '}
            <strong>{ciudad.entidadTransito}</strong> a menudo contienen errores de procedimiento
            que permiten la caducidad del cobro.
          </p>
        </div>
      </section>

      {/* Contexto Legal */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 bg-slate-50 dark:bg-white/5 border-y border-slate-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 bg-white dark:bg-black/40 p-6 sm:p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="shrink-0 p-3 sm:p-4 bg-slate-100 dark:bg-white/5 rounded-2xl">
              <BookOpen
                size={28}
                className="text-slate-700 dark:text-white/80 w-6 h-6 sm:w-7 sm:h-7"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                El Error de la Secretaría de Tránsito
              </h2>
              <p className="text-slate-600 dark:text-white/70 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                {infraccion.contexto_legal}
              </p>
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
            Sube la foto o captura de pantalla del SIMIT. Nuestro sistema analizará en segundos si
            la multa por {infraccion.nombre} en {ciudad.nombre} es legalmente válida.
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
