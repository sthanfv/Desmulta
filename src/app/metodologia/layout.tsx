import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuestra Metodología | Desmulta',
  description:
    'Conozca cómo operamos y defendemos sus derechos viales con tecnología y transparencia.',
};

export default function MetodologiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
