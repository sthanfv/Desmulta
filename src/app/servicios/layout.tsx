import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Servicios de Saneamiento Vial | Desmulta',
  description:
    'Servicios especializados en defensa y saneamiento de multas de tránsito en Colombia.',
};

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
