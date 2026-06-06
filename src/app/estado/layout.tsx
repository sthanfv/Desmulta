import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consultar estado de tu caso | Desmulta',
  description:
    'Ingresa tu cédula y número de celular para consultar el estado actual de tu trámite de fotomulta o comparendo.',
  robots: {
    index: false, // No indexar — es una página de acceso privado
    follow: false,
  },
};

export default function EstadoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
