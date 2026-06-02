import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Landmark, Gavel, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import ciudades from '@/lib/data/ciudades.json';
import { getCityData } from '@/lib/data/city-seo-config';

interface PageProps {
  params: Promise<{ ciudad: string }>;
}

export const revalidate = 86400; // Un día completo (SEO Articles cambian poco)
export const dynamicParams = false;

export async function generateStaticParams() {
  return ciudades.map((c) => ({ ciudad: c.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { ciudad } = await props.params;
  const ciudadInfo = ciudades.find((c) => c.slug === ciudad);
  if (!ciudadInfo) return { title: 'No encontrado' };

  const title = `Guía Legal: Fotomultas y Tránsito en ${ciudadInfo.nombre} | Desmulta`;
  const description = `Conozca sus derechos legales frente a comparendos y fotomultas en ${ciudadInfo.nombre}. Información sobre prescripción, caducidad y defensa jurídica ante el Tránsito de ${ciudadInfo.departamento}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/servicios/${ciudad}/articulos`,
    },
  };
}

export default async function ArticulosCiudad(props: PageProps) {
  const { ciudad } = await props.params;
  const ciudadInfo = ciudades.find((c) => c.slug === ciudad);
  const cityData = getCityData(ciudad);

  if (!ciudadInfo) notFound();

  // Datos por defecto si no hay configuración específica
  const defaultAuthority = `Secretaría de Tránsito de ${ciudadInfo.nombre}`;
  const defaultTips = [
    'Toda fotomulta debe ser notificada en los primeros 13 días hábiles a su dirección del RUNT.',
    'Los comparendos prescriben a los 3 años si no hay mandamiento de pago.',
    'La caducidad de una infracción ocurre si no se realiza audiencia en 1 año.',
  ];

  const authority = cityData?.transitAuthority || defaultAuthority;
  const tips = cityData?.tips || defaultTips;

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-slate-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-600/10 to-transparent pt-32 pb-16">
        <div className="container mx-auto px-6 relative z-10">
          <Link
            href={`/servicios/${ciudad}`}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {ciudadInfo.nombre}
          </Link>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Guía de Tránsito y Fotomultas en{' '}
            <span className="text-blue-500">{ciudadInfo.nombre}</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
            Todo lo que necesita saber sobre la defensa jurídica de comparendos y fotodetecciones
            bajo la Ley 1843 de 2017 y el Código Nacional de Tránsito en {ciudadInfo.nombre},{' '}
            {ciudadInfo.departamento}.
          </p>
        </div>

        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4" />
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <Landmark className="w-6 h-6 text-blue-500" />
                Contexto Legal en {ciudadInfo.nombre}
              </h2>
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 leading-relaxed space-y-4">
                <p>
                  En <strong>{ciudadInfo.nombre}</strong>, los procesos contravencionales de
                  tránsito se rigen por las directrices de la <strong>{authority}</strong>. Es
                  fundamental entender que el sistema de fotodetección en Colombia ha sido objeto de
                  importantes fallos de la Corte Constitucional (especialmente la Sentencia C-038 de
                  2020), que protege al ciudadano contra la responsabilidad objetiva.
                </p>
                <p>
                  Si usted ha sido captado por una cámara en {ciudadInfo.nombre}, la autoridad debe
                  probar plenamente quién era el conductor en el momento de la infracción. No basta
                  con ser el propietario del vehículo para ser sancionado automáticamente.
                </p>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Tips de Defensa para {ciudadInfo.nombre}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tips.map((tip, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/50 hover:border-blue-500/30 transition-colors"
                  >
                    <p className="text-slate-300">{tip}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <Gavel className="w-6 h-6 text-blue-500" />
                Prescripción y Caducidad
              </h2>
              <div className="space-y-4">
                <div className="flex gap-6 p-6 rounded-2xl bg-blue-600/5 border border-blue-500/10">
                  <div className="flex-shrink-0">
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Caducidad (1 Año)</h3>
                    <p className="text-slate-400">
                      Si el Tránsito de {ciudadInfo.nombre} no realiza la audiencia pública y emite
                      una resolución sancionatoria dentro del primer año desde la fecha de la
                      infracción, la acción caduca de pleno derecho.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 p-6 rounded-2xl bg-blue-600/5 border border-blue-500/10">
                  <div className="flex-shrink-0">
                    <Gavel className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Prescripción (3 Años)</h3>
                    <p className="text-slate-400">
                      Una vez sancionado, el Tránsito tiene 3 años para iniciar el cobro coactivo.
                      Si no hay una notificación efectiva de un mandamiento de pago en este periodo,
                      la deuda prescribe.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-xl shadow-blue-500/10">
              <h3 className="text-xl font-bold text-white mb-4">¿Necesita Ayuda Jurídica?</h3>
              <p className="text-blue-50 mb-6 text-sm">
                Analizamos su expediente en el SIMIT y el Tránsito de {ciudadInfo.nombre} sin costo
                inicial.
              </p>
              <Link
                href={`/servicios/${ciudad}#contacto`}
                className="block w-full py-3 px-6 bg-white text-blue-600 font-bold rounded-xl text-center hover:bg-blue-50 transition-colors"
              >
                Iniciar Estudio Gratis
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Información Local
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Departamento</span>
                  <span className="text-slate-300">{ciudadInfo.departamento}</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Población Aprox.</span>
                  <span className="text-slate-300">{cityData?.population || 'N/A'}</span>
                </li>
                {cityData?.transitUrl && (
                  <li className="pt-2">
                    <a
                      href={cityData.transitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Sitio Web del Tránsito Local
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <footer className="border-t border-slate-800/50 py-12 mt-12 bg-slate-950/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Desmulta. Información legal de carácter informativo para{' '}
            {ciudadInfo.nombre}. Sujeto a cambios en la normativa nacional.
          </p>
        </div>
      </footer>
    </main>
  );
}
