import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Desmulta',
  description: 'Términos y condiciones de uso de los servicios legales y tecnológicos de Desmulta.',
};

export default function TerminosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
