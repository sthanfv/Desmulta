import { notFound } from 'next/navigation';
import { getExpedienteCacheado } from '@/app/actions/tracking';
import type { TrackingCase } from '@/lib/definitions';
import TrackingClientUI from './TrackingClientUI';
import { Metadata } from 'next';

const LABELS: Record<string, string> = {
  APERTURA: 'Apertura de Expediente',
  RADICADO: 'Radicado en SIMIT',
  TRAMITE: 'En Trámite',
  FINALIZADO: 'Caso Finalizado',
  NUEVO: 'Solicitud Recibida',
  CONTACTADO: 'En Contacto',
  ESTUDIO: 'En Estudio',
  CONVERTIDO: 'Expediente Iniciado',
  DESCARTADO: 'Caso No Viable',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const targetId = resolvedParams.id;

  const caseData = await getExpedienteCacheado(targetId);
  const estadoLabel = LABELS[caseData?.status ?? ''] ?? caseData?.status ?? 'Consultando...';
  const shortId = caseData?.shortId || targetId.slice(0, 8);
  const title = `Estado de Caso: ${estadoLabel} | Desmulta`;
  const desc = caseData?.nombre
    ? `Hola ${caseData.nombre.split(' ')[0]}, el estado de tu expediente ${shortId} es: ${estadoLabel}.`
    : `Expediente ${shortId}. Actualizado recientemente. Revisa los detalles de tu trámite.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `https://desmulta.online/seguir/${targetId}`,
      siteName: 'Desmulta',
      type: 'website',
      images: [
        {
          url: `https://desmulta.online/seguir/${targetId}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `Estado del Expediente - Desmulta`,
        },
      ],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const revalidate = 30; // Fuerza la revalidación estática de la página en la CDN

export default async function PaginaSeguimiento({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.id;

  const caseData = await getExpedienteCacheado(targetId);

  if (!caseData) {
    notFound(); // Redirige al 404 nativo de Next.js si el expediente no existe en BDD/Caché
  }

  return <TrackingClientUI caseData={caseData as TrackingCase} />;
}
