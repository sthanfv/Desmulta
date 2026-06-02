import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes | Desmulta',
  description:
    'Todo lo que necesita saber sobre el saneamiento vial y nuestros procesos administrativos.',
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
