import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escudo SIMIT | Monitoreo 24/7 de Multas y Comparendos',
  description: 'Sistema inteligente de vigilancia 24/7. Detectamos y te notificamos al instante sobre fotomultas y comparendos antes de los cobros coactivos.',
  openGraph: {
    title: 'Escudo SIMIT | Desmulta',
    description: 'Sistema inteligente de vigilancia 24/7. Detectamos y te notificamos al instante sobre fotomultas y comparendos.',
    url: 'https://desmulta.online/escudo-simit',
    siteName: 'Desmulta',
    images: [
      {
        url: 'https://desmulta.online/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Escudo SIMIT - Monitoreo de Fotomultas',
      },
    ],
    locale: 'es_CO',
    type: 'website',
  },
};

export default function EscudoSimitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
