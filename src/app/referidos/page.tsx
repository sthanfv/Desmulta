import { Metadata } from 'next';
import { ReferralsClient } from './ReferralsClient';

export const metadata: Metadata = {
  title: 'Programa de Referidos | Desmulta VIP',
  description:
    'Refiere a un amigo o familiar y obtén beneficios exclusivos al gestionar sus multas de tránsito. Comparte el enlace seguro.',
};

export default function ReferidosPage() {
  return <ReferralsClient />;
}
