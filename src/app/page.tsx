/**
 * Página Principal — Server Component
 *
 * Estrategia React 19 — MANDATO-FILTRO v5.4.1:
 * - Los datos de Firestore (showcaseData, footerData) se obtienen AQUÍ, en el servidor,
 *   usando Firebase Admin SDK + cache() de React 19.
 * - Los datos pre-renderizados se pasan como props a <HomeClient />.
 * - HomeClient contiene toda la interactividad (estado, eventos, formularios).
 *
 * Beneficio: el navegador recibe el HTML ya completo. Menos JS en el cliente.
 * TTI (Time to Interactive) reducido al eliminar fetches en el navegador.
 */

import HomeClient from '@/app/_components/HomeClient';
import { getShowcaseConfig, getFooterConfig } from '@/lib/site-config';

export default async function VialClearPage() {
  // Fetching en paralelo en el servidor — no bloquean entre sí
  const [showcaseData, footerData] = await Promise.all([getShowcaseConfig(), getFooterConfig()]);

  return <HomeClient showcaseData={showcaseData} footerData={footerData} />;
}
