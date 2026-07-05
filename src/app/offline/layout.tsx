import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sin Conexión | Desmulta',
  description: 'Parece que no tienes conexión a internet en este momento.',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
