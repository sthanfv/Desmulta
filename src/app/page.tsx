/**
 * Página Principal — Server Component
 *
 * Estrategia React 19 — MANDATO-FILTRO v5.17.0:
 * - Los datos de Firestore (showcaseData, footerData) se obtienen AQUÍ, en el servidor,
 *   usando Firebase Admin SDK + cache() de React 19.
 * - Los datos pre-renderizados se pasan como props a <HomeClient />.
 * - HomeClient contiene toda la interactividad (estado, eventos, formularios).
 *
 * Beneficio: el navegador recibe el HTML ya completo. Menos JS en el cliente.
 * TTI (Time to Interactive) reducido al eliminar fetches en el navegador.
 */

import HomeClient from '@/app/_components/HomeClient';
import { getShowcaseConfig, getFooterConfig } from '@/lib/site-config';

import { safeJsonLdStringify } from '@/lib/utils/json-ld';
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.online';

export const metadata: Metadata = {
  title: 'Desmulta — Expertos en Multas de Tránsito Colombia',
  description: 'Análisis técnico de multas de tránsito en Colombia. Identificamos si su caso tiene fundamentos de prescripción, caducidad o vicios de notificación.',
};

/** Schema.org JSON-LD para la homepage — mejora la apariencia en Google (rich results) */
const homepageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LegalService',
      '@id': `${SITE_URL}/#organization`,
      name: 'Desmulta',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      image: `${SITE_URL}/og-image.png`,
      description:
        'Blindaje legal experto para fotomultas y comparendos en Colombia. Saneamiento integral con absoluta reserva y transparencia.',
      areaServed: {
        '@type': 'Country',
        name: 'Colombia',
      },
      serviceType: 'Saneamiento de Multas de Tránsito e Impugnación Legal',
      priceRange: 'Consulta gratuita',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Asesoría Legal',
        availableLanguage: ['Spanish', 'English'],
        telephone: '+573005648309',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Desmulta',
      description: 'Expertos en saneamiento de multas de tránsito en Colombia.',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/servicios/{search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/#breadcrumbs`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Inicio',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Servicios de Saneamiento',
          item: `${SITE_URL}/servicios`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Calculadora de Prescripción',
          item: `${SITE_URL}/calculadora`,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Cómo funciona el estudio de viabilidad gratuito?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Nuestro sistema analiza tu situación en el SIMIT y determina si tu multa puede prescribir o impugnarse. El estudio inicial es completamente gratuito.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué es la prescripción de una multa de tránsito?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'En Colombia, las multas de tránsito pueden prescribir después de 5 años si el proceso coactivo no fue iniciado correctamente. Esto elimina legalmente la deuda.',
          },
        },
      ],
    },
  ],
};

export default async function VialClearPage() {
  // Al eliminar headers(), esta página se puede compilar estáticamente (SSG)
  const [showcaseData, footerData] = await Promise.all([
    getShowcaseConfig(),
    getFooterConfig(),
  ]);

  const ciudad = 'Colombia'; // Fallback estático para BFCache

  const nonce = '';

  return (
    <>
      {/* JSON-LD inyectado en el <head> vía script — Google lo indexa como rich result */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(homepageJsonLd) }}
      />
      <HomeClient
        showcaseData={showcaseData}
        footerData={footerData}
        cityContext={ciudad}
        nonce={nonce}
      />
    </>
  );
}
