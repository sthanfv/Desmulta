import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import ciudades from '@/lib/data/ciudades.json';
import HomeClient from '@/app/_components/HomeClient';
import { getShowcaseConfig, getFooterConfig } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ ciudad: string }>;
}

/**
 * Dinamicidad de Ciudades — MANDATO-FILTRO v5.4.0
 * Genera miles de landing pages optimizadas para cada municipio.
 *
 * MANDATO-FILTRO v8.11.0 (ISR):
 * - revalidate = 3600: la página se re-genera en el servidor cada hora.
 *   Entre regeneraciones, Vercel sirve la versión cacheada sin tocar Firebase.
 * - dynamicParams = false: cualquier slug no pre-generado en build devuelve 404,
 *   previniendo generación dinámica en tiempo de ejecución y posibles abusos.
 */
export const revalidate = 604800; // 7 días en segundos
export const dynamicParams = false;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { ciudad } = await props.params;
  const ciudadActual = ciudades.find((c) => c.slug === ciudad);

  if (!ciudadActual) {
    return {
      title: 'Página no encontrada | Desmulta',
    };
  }

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';
  const title = `Impugnar Fotomultas y Comparendos en ${ciudadActual.nombre}, ${ciudadActual.departamento} | ${brandName}`;
  const description = `Expertos en saneamiento de multas de tránsito y vencimiento de términos en ${ciudadActual.nombre}. Resolvemos sus procesos legales con el Tránsito de ${ciudadActual.departamento} de forma técnica y legal.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online';
  const ogImageUrl = `${siteUrl}/api/og?ciudad=${encodeURIComponent(ciudadActual.nombre)}&dept=${encodeURIComponent(ciudadActual.departamento)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// Pre-generamos las rutas más importantes en build-time para máxima velocidad (ISR)
export async function generateStaticParams() {
  return ciudades.map((ciudad) => ({
    ciudad: ciudad.slug,
  }));
}

export default async function PaginaCiudad(props: PageProps) {
  const { ciudad } = await props.params;
  const ciudadActual = ciudades.find((c) => c.slug === ciudad);

  if (!ciudadActual) {
    notFound();
  }

  // Obtenemos la configuración global (Server-Side)
  const [showcaseData, footerData] = await Promise.all([getShowcaseConfig(), getFooterConfig()]);

  // --- MANDATO-FILTRO v5.9.0 (SEO ESTRUCTURADO) ---
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: `Desmulta ${ciudadActual.nombre}`,
    description: `Expertos en saneamiento de multas de tránsito en ${ciudadActual.nombre}. Resolvemos procesos legales con el Tránsito de ${ciudadActual.departamento}.`,
    areaServed: {
      '@type': 'City',
      name: ciudadActual.nombre,
    },
    address: {
      '@type': 'PostalAddress',
      addressRegion: ciudadActual.departamento,
      addressCountry: 'CO',
    },
    priceRange: '$$',
    image: 'https://desmulta.online/icon.png',
  };

  return (
    <div
      className="location-context"
      data-city={ciudadActual.nombre}
      data-dept={ciudadActual.departamento}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient
        showcaseData={showcaseData}
        footerData={footerData}
        cityContext={ciudadActual.nombre}
      />

      {/* CONTEXTO PROGRAMÁTICO SEO - GROWTH AUDIT */}
      <section className="bg-background pt-16 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-6 border border-primary/20 shadow-sm">
            <ShieldCheck size={14} />{' '}
            <span>{ciudadActual.entidadTransito || 'Tránsito Municipal'}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 tracking-tight">
            Fotomultas y Comparendos en {ciudadActual.nombre}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {ciudadActual.textoContexto ||
              `Servicios de impugnación y defensa legal de multas de tránsito para los ciudadanos de ${ciudadActual.nombre}.`}
          </p>
        </div>
      </section>

      {/* SEO INTERNAL LINKING - v8.12.0 */}
      <section className="bg-[#0A0A0B] pb-24 px-6">
        <div className="max-w-4xl mx-auto p-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-900/10 to-transparent flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Guía Legal en {ciudadActual.nombre}
            </h2>
            <p className="text-slate-400">
              Conozca a fondo cómo funcionan las fotomultas y la prescripción de comparendos en{' '}
              {ciudadActual.nombre}.
            </p>
          </div>
          <Link
            href={`/servicios/${ciudad}/articulos`}
            className="whitespace-nowrap px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl border border-slate-700 transition-all"
          >
            Leer Guía Completa
          </Link>
        </div>
      </section>
    </div>
  );
}
