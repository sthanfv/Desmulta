import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Scale, MapPin } from 'lucide-react';
import ciudadesData from '@/lib/data/ciudades.json';
import infraccionesData from '@/lib/data/infracciones.json';

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
          __html: JSON.stringify({
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
      <div className="min-h-screen bg-black text-white selection:bg-brand-500/30 selection:text-white">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-black/90 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <MapPin size={16} className="text-brand-400" />
              <span className="text-sm font-medium tracking-wide text-white/80 uppercase">
                {ciudad.departamento}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              Defensa legal contra fotomultas en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                {ciudad.nombre}
              </span>
            </h1>

            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              {ciudad.textoContexto} Actúa antes de que la{' '}
              <strong className="text-white">{ciudad.entidadTransito}</strong> inicie un proceso de
              cobro coactivo.
            </p>

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
        <section className="py-20 px-6 md:px-12 bg-white/5 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                ¿Qué tipo de problema tienes en {ciudad.nombre}?
              </h2>
              <p className="text-white/60">
                Selecciona tu caso para conocer las estrategias de defensa exactas en tu ciudad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {infraccionesData.map((infraccion) => (
                <Link
                  key={infraccion.slug}
                  href={`/multas/${ciudad.slug}/${infraccion.slug}`}
                  className="group p-6 rounded-[2rem] bg-black/40 border border-white/5 hover:border-brand-500/50 hover:bg-white/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ShieldAlert size={24} className="text-brand-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white group-hover:text-brand-400 transition-colors">
                    {infraccion.nombre}
                  </h3>
                  <p className="text-sm text-white/60 line-clamp-2">{infraccion.descripcion_seo}</p>
                  <div className="mt-6 flex items-center gap-2 text-brand-500 text-sm font-semibold">
                    Ver estrategia{' '}
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </Link>
              ))}
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
