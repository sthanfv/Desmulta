import { Metadata } from 'next';
import { ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { SavingsCalculator } from '@/components/interactive/SavingsCalculator';
import { safeJsonLdStringify } from '@/lib/utils/json-ld';

// Metadatos SEO Hiper-Optimizados
export const metadata: Metadata = {
  title: 'Calculadora de Prescripción de Fotomultas en Colombia 2026 | Desmulta',
  description:
    'Usa nuestra calculadora gratuita para saber inmediatamente si tu fotomulta o comparendo ya está prescrito o caducado. Ahorra hasta el 100% de la deuda.',
  keywords: [
    'calculadora fotomulta 2026',
    'prescripcion de multas colombia',
    'caducidad comparendos',
    'calcular deuda transito',
    'simit calculadora',
  ],
  openGraph: {
    title: '¿Tu fotomulta ya prescribió? Calcúlalo Gratis',
    description:
      'Descubre en 10 segundos si ya no tienes que pagar tu fotomulta gracias a la prescripción o caducidad.',
    url: 'https://desmulta.online/calculadora',
    siteName: 'Desmulta',
    locale: 'es_CO',
    type: 'website',
  },
  alternates: {
    canonical: 'https://desmulta.online/calculadora',
  },
};

export default function CalculadoraPage() {
  // JSON-LD Schema estructurado para Google Rich Snippets (HowTo/SoftwareApplication)
  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calculadora de Prescripción de Multas Desmulta',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'COP',
    },
    description:
      'Calculadora gratuita para saber si tu fotomulta de tránsito en Colombia ya prescribió o caducó y cuánto dinero te puedes ahorrar.',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col relative selection:bg-yellow-400 selection:text-black">
      {/* Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaMarkup) }}
      />

      {/* Header Sutil */}
      <header
        data-desktop-header
        className="w-full p-6 border-b border-zinc-800/80 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-6 h-6 text-yellow-400" />
            <span className="text-xl font-black tracking-widest text-white">DESMULTA</span>
          </Link>
          <Link
            href="/documentos/generador/peticion-general"
            className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
          >
            Generar Petición
          </Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 sm:p-12">
        <div className="max-w-4xl w-full text-center mb-12 mt-8">
          <div className="inline-block bg-yellow-400/10 text-yellow-400 font-bold px-4 py-1.5 rounded-full text-sm mb-6 border border-yellow-400/20">
            100% Gratuito y Actualizado a 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            Descubre si tu fotomulta ya está <span className="text-yellow-400">Prescrita</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            Por ley, si Tránsito no actuó a tiempo, tu multa debe ser borrada. Usa nuestra
            calculadora oficial y descubre cuánto dinero te puedes ahorrar hoy mismo.
          </p>
        </div>

        {/* Contenedor de la Calculadora Interactiva */}
        <div className="w-full max-w-4xl bg-[#111111] border border-zinc-800 rounded-3xl p-4 sm:p-8 shadow-2xl relative z-10 mb-16">
          <SavingsCalculator />
        </div>

        {/* Call to Action Fuerte */}
        <div className="max-w-3xl w-full bg-yellow-400 text-black rounded-[2rem] p-8 md:p-12 text-center transform transition-all hover:scale-[1.02] shadow-[0_0_40px_rgba(250,204,21,0.15)] mb-12">
          <FileText className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-black mb-4">¿Te saliste ahorrando?</h2>
          <p className="text-black/80 font-medium text-lg mb-8 max-w-xl mx-auto">
            No basta con saberlo. Si tu multa cumple los requisitos, genera ahora mismo el documento
            legal (Derecho de Petición) para exigir que te la borren del SIMIT.
          </p>
          <Link
            href="/documentos/generador/peticion-general"
            className="inline-flex items-center justify-center gap-3 bg-black text-yellow-400 font-extrabold text-xl py-5 px-10 rounded-full hover:bg-zinc-900 transition-colors"
          >
            Generar Petición por $19.500 <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-4 text-sm font-bold text-black/60">
            Entrega Inmediata en PDF. Listo para radicar.
          </p>
        </div>

        {/* FAQ Rápido para SEO */}
        <div className="max-w-3xl w-full text-left space-y-6">
          <h3 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">
            Preguntas Frecuentes
          </h3>
          <article>
            <h4 className="text-yellow-400 font-bold mb-2">
              ¿Cuándo prescribe una fotomulta en Colombia?
            </h4>
            <p className="text-zinc-400">
              Por regla general, si la Secretaría de Movilidad no te ha cobrado mediante un proceso
              de &quot;Cobro Coactivo&quot; en un plazo de 3 años, la multa prescribe. Si tienen
              cobro coactivo, el plazo puede extenderse a 6 años totales, pero existen vacíos
              legales que permiten tumbarlas antes.
            </p>
          </article>
          <article>
            <h4 className="text-yellow-400 font-bold mb-2">¿La calculadora es exacta?</h4>
            <p className="text-zinc-400">
              Nuestra calculadora de caducidad y prescripción de multas evalúa los tiempos legales
              establecidos en el Código Nacional de Tránsito (Ley 769 de 2002). Sin embargo, siempre
              recomendamos generar el Derecho de Petición para formalizar la eliminación del SIMIT.
            </p>
          </article>
        </div>
      </main>

      <footer className="w-full text-center py-8 text-zinc-500 text-sm border-t border-zinc-900 mt-12">
        <p>© 2026 Desmulta. Todos los derechos reservados. No somos una entidad gubernamental.</p>
      </footer>
    </div>
  );
}
