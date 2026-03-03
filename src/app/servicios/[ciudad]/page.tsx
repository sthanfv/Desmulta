import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ciudades from '@/lib/data/ciudades.json';
import HomeClient from '@/app/_components/HomeClient';
import { getShowcaseConfig, getFooterConfig } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ ciudad: string }>;
}

/**
 * Dinamicidad de Ciudades — MANDATO-FILTRO v5.4.0
 * Genera miles de landing pages optimizadas para cada municipio.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ciudad } = await params;
  const ciudadActual = ciudades.find((c) => c.slug === ciudad);

  if (!ciudadActual) {
    return {
      title: 'Página no encontrada | Desmulta',
    };
  }

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';
  const title = `Impugnar Fotomultas y Comparendos en ${ciudadActual.nombre}, ${ciudadActual.departamento} | ${brandName}`;
  const description = `Expertos en saneamiento de multas de tránsito, prescripción y caducidad en ${ciudadActual.nombre}. Resolvemos sus procesos legales con el Tránsito de ${ciudadActual.departamento} de forma técnica y legal.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/icon.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/icon.png'],
    },
  };
}

// Pre-generamos las rutas más importantes en build-time para máxima velocidad (ISR)
export async function generateStaticParams() {
  return ciudades.map((ciudad) => ({
    ciudad: ciudad.slug,
  }));
}

export default async function PaginaCiudad({ params }: PageProps) {
  const { ciudad } = await params;
  const ciudadActual = ciudades.find((c) => c.slug === ciudad);

  if (!ciudadActual) {
    notFound();
  }

  // Obtenemos la configuración global (Server-Side)
  const [showcaseData, footerData] = await Promise.all([getShowcaseConfig(), getFooterConfig()]);

  // Personalizamos ligeramente el contenido para la ciudad si es necesario
  // Por ahora, reutilizamos HomeClient pasando la ciudad como contexto extra si fuera necesario
  // (HomeClient podría ser actualizado para mostrar el nombre de la ciudad en el Hero)

  return (
    <div
      className="location-context"
      data-city={ciudadActual.nombre}
      data-dept={ciudadActual.departamento}
    >
      <HomeClient
        showcaseData={showcaseData}
        footerData={footerData}
        cityContext={ciudadActual.nombre}
      />
    </div>
  );
}
