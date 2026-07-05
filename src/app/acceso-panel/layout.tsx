import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso Panel Operadores | Desmulta',
  description: 'Acceso exclusivo para operadores autorizados de Desmulta.',
  robots: {
    index: false, // Panel privado — no indexar
    follow: false,
  },
};

export default function AccesoPanelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
