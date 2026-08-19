import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import ListaCamarasCiudad from '@/components/camaras/ListaCamarasCiudad';
import ciudadesData from '@/lib/data/ciudades.json';

type Props = {
  params: Promise<{
    ciudad: string;
  }>;
};

// Generamos las rutas estáticamente durante el build
export function generateStaticParams() {
  return ciudadesData.map((ciudad) => ({
    ciudad: ciudad.slug,
  }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);

  if (!ciudad) {
    return { title: 'Cámaras no encontradas' };
  }

  return {
    title: `Ubicación de Cámaras de Fotomultas (SAST) en ${ciudad.nombre} | Desmulta`,
    description: `Consulta el mapa exacto y listado oficial de cámaras de fotodetección autorizadas por la ANSV en ${ciudad.nombre}, ${ciudad.departamento}.`,
    keywords: `cámaras fotomultas ${ciudad.nombre}, ubicacion camaras salvavidas ${ciudad.nombre}, SAST ${ciudad.nombre}`,
  };
}

export default async function CamarasCiudadPage(props: Props) {
  const params = await props.params;
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);

  if (!ciudad) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 w-full z-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl px-6 sm:px-8 h-16 flex items-center justify-between shadow-sm border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md">
          <Link
            href={`/multas/${ciudad.slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Volver a {ciudad.nombre}</span>
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="text-brand-500" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase">Radares ANSV</span>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Cámaras Autorizadas en <span className="text-brand-500">{ciudad.nombre}</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Directorio oficial de la Agencia Nacional de Seguridad Vial
          </p>
        </div>

        <ListaCamarasCiudad ciudadNombre={ciudad.nombre} ciudadSlug={ciudad.slug} />
      </main>
    </div>
  );
}
