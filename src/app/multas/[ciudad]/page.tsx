import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Scale, MapPin, ArrowLeft, ShieldCheck } from 'lucide-react';
import ciudadesData from '@/lib/data/ciudades.json';
import infraccionesData from '@/lib/data/infracciones.json';
import { safeJsonLdStringify } from '@/lib/utils/json-ld';

export const revalidate = 604800; // 7 días

type Props = {
  params: Promise<{
    ciudad: string;
  }>;
};

// Generamos las rutas estáticamente durante el build
export function generateStaticParams() {
  return ciudadesData.map((ciudad) => ({
    ciudad: ciudad.slug,
  }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);

  if (!ciudad) {
    return {
      title: 'Ciudad no encontrada',
    };
  }

  return {
    title: `Cómo impugnar fotomultas y comparendos en ${ciudad.nombre} | Desmulta`,
    description: `Defensa legal experta contra fotomultas, embargos y comparendos en ${ciudad.nombre}, ${ciudad.departamento}. Trámites ante la ${ciudad.entidadTransito}.`,
    keywords: `fotomultas ${ciudad.nombre}, comparendos ${ciudad.nombre}, tránsito ${ciudad.nombre}, embargos ${ciudad.nombre}, impugnar multas`,
  };
}

export default async function MultasCiudadPage(props: Props) {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);

  if (!ciudad) {
    notFound();
  }

  return (
    <>
      {/* SEO: JSON-LD LegalService + LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify({
            '@context': 'https://schema.org',
            '@type': ['LegalService', 'LocalBusiness'],
            name: `Desmulta — Defensa de Fotomultas en ${ciudad.nombre}`,
            description: `Auditoría legal contra fotomultas, comparendos y embargos en ${ciudad.nombre}. Prescripción, caducidad y nulidades ante la ${ciudad.entidadTransito}.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online'}/multas/${ciudad.slug}`,
            areaServed: {
              '@type': 'City',
              name: ciudad.nombre,
              containedInPlace: {
                '@type': 'State',
                name: ciudad.departamento,
              },
            },
            serviceType: 'Defensa legal contra multas de tránsito',
            telephone: '+573005648309',
            address: (ciudad as Record<string, unknown>).address || {
              '@type': 'PostalAddress',
              streetAddress: 'Sede Virtual',
              addressLocality: ciudad.nombre,
              addressRegion: ciudad.departamento,
              addressCountry: 'CO',
            },
            provider: {
              '@type': 'Organization',
              name: 'Desmulta',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online',
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'COP',
              description: 'Consulta inicial gratuita',
            },
          }),
        }}
      />
      {/* SEO: JSON-LD FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: `¿Cómo impugnar una fotomulta en ${ciudad.nombre}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `Para impugnar una fotomulta en ${ciudad.nombre}, debes solicitar una audiencia ante la ${ciudad.entidadTransito} dentro de los primeros 11 días hábiles siguientes a la notificación. Es crucial revisar si la notificación cumplió los tiempos establecidos en la Ley 1843.`,
                },
              },
              {
                '@type': 'Question',
                name: `¿Cuándo caduca un comparendo en ${ciudad.nombre}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `En ${ciudad.nombre} y toda Colombia, la caducidad ocurre si la ${ciudad.entidadTransito} no emite resolución sancionatoria dentro del año siguiente a la ocurrencia de la infracción, según el artículo 161 del Código Nacional de Tránsito.`,
                },
              },
              {
                '@type': 'Question',
                name: `¿Qué pasa si me embargan cuentas por multas en ${ciudad.nombre}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `Si la ${ciudad.entidadTransito} ordena un embargo, nuestro equipo de auditores jurídicos puede revisar el expediente para identificar vicios de nulidad y solicitar el levantamiento cautelar de las medidas.`,
                },
              },
            ],
          }),
        }}
      />
      <div className="min-h-screen bg-background text-foreground selection:bg-brand-500/30 selection:text-primary-foreground relative">
        {/* Header flotante para navegación fácil */}
        <header className="fixed top-0 w-full z-50 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto glass rounded-3xl px-6 sm:px-8 h-16 flex items-center justify-between shadow-2xl border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <Link
              href="/#contacto"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-sm">Inicio</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand-500" size={20} />
              <span className="font-black tracking-tighter text-lg uppercase text-foreground">
                Defensa Local
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-36 sm:pt-44 pb-16 sm:pb-20 px-4 sm:px-6 md:px-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 dark:from-brand-900/20 to-background pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6 sm:mb-8 backdrop-blur-md">
              <MapPin size={16} className="text-brand-500 dark:text-brand-400" />
              <span className="text-xs sm:text-sm font-medium tracking-wide text-slate-700 dark:text-white/80 uppercase">
                {ciudad.departamento}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              Defensa legal contra fotomultas en{' '}
              <span className="text-brand-500">{ciudad.nombre}</span>
            </h1>

            {/* Texto dinámico SEO Programático con efecto Glassmorphism Premium */}
            <div className="relative group overflow-hidden bg-slate-50 dark:bg-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] border border-slate-200 dark:border-white/10 mb-8 sm:mb-10 backdrop-blur-xl shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-brand-500/30 hover:-translate-y-1">
              {/* Decoración de luz interna */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-0 dark:opacity-30 group-hover:opacity-100 transition-opacity duration-700"></div>

              {/* Efecto de resplandor (Glow) detrás del texto */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

              <p className="relative z-10 text-slate-700 dark:text-white/80 leading-relaxed text-base sm:text-lg font-light text-left sm:text-center">
                {ciudad.seoIntro ||
                  `Si recibiste una fotomulta o comparendo injusto en ${ciudad.nombre}, nuestro equipo de auditores jurídicos está listo para defenderte. Nuestra auditoría verifica paso a paso si la ${ciudad.entidadTransito} cumplió con los tiempos legales de notificación según la Ley 1843. No pagues sin antes consultar. Revisa tu estado con nosotros de forma 100% confidencial.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/#escaner"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Consultar SIMIT Gratis <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* Tipos de Infracción Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                ¿Qué tipo de problema tienes en {ciudad.nombre}?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Selecciona tu caso específico para conocer la jurisprudencia aplicable y cómo
                podemos ejercer tu derecho a la defensa ante la {ciudad.entidadTransito}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {infraccionesData.map((infraccion) => (
                <Link
                  key={infraccion.slug}
                  href={`/multas/${ciudad.slug}/${infraccion.slug}`}
                  className="group block p-6 sm:p-8 rounded-3xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-brand-500/5 transition-all shadow-sm"
                >
                  <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors text-foreground">
                    {infraccion.nombre}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/60 line-clamp-2">
                    {infraccion.descripcion_seo}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-brand-500 text-sm font-semibold">
                    Ver estrategia{' '}
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </Link>
              ))}

              {/* Enlace destacado hacia el directorio de cámaras de fotomultas de la ciudad */}
              <Link
                href={`/multas/${ciudad.slug}/camaras`}
                className="group block p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-black dark:from-white/10 dark:to-white/5 border border-slate-800 dark:border-white/10 hover:border-brand-500 transition-all shadow-lg col-span-1 md:col-span-2 lg:col-span-1"
              >
                <div className="inline-flex items-center justify-center p-3 bg-brand-500/20 rounded-xl mb-4">
                  <MapPin className="text-brand-500" size={24} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-white">
                  Directorio de Cámaras (ANSV)
                </h3>
                <p className="text-sm text-white/70 line-clamp-2">
                  Verifica la ubicación exacta de las cámaras de fotodetección autorizadas en{' '}
                  {ciudad.nombre}.
                </p>
                <div className="mt-6 flex items-center gap-2 text-brand-500 text-sm font-bold">
                  Explorar mapa{' '}
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-[3rem] bg-gradient-to-br from-brand-900/40 to-black border border-brand-500/20">
            <Scale size={48} className="text-brand-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              No dejes que tu patrimonio en {ciudad.nombre} corra riesgo
            </h2>
            <p className="text-lg text-white/70 mb-10">
              Nuestro algoritmo evalúa si tu multa cumple con los requisitos para ser eliminada
              según las últimas sentencias de la Corte Constitucional.
            </p>
            <Link
              href="/#escaner"
              className="inline-flex px-8 py-4 rounded-2xl bg-white hover:bg-gray-100 text-black font-bold text-lg transition-all active:scale-95 items-center justify-center gap-2"
            >
              Subir foto de la multa
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
