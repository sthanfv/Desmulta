'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { m, LazyMotion, domAnimation } from 'framer-motion';

interface Infraccion {
  slug: string;
  nombre: string;
  descripcion_seo: string;
}

interface Ciudad {
  slug: string;
  nombre: string;
}

interface Props {
  infraccionesData: Infraccion[];
  ciudad: Ciudad;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Variation: slightly slower stagger
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

export function ClientInfraccionesGrid({ infraccionesData, ciudad }: Props) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        {infraccionesData.map((infraccion) => (
          <m.div key={infraccion.slug} variants={itemVariants} className="h-full">
            <Link
              href={`/multas/${ciudad.slug}/${infraccion.slug}`}
              className="group block h-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-brand-500/5 transition-all shadow-sm"
            >
              <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors text-foreground">
                {infraccion.nombre}
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/60 line-clamp-2">
                {infraccion.descripcion_seo}
              </p>
              <div className="mt-6 flex items-center gap-2 text-brand-500 text-sm font-semibold">
                Ver estrategia{' '}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Link>
          </m.div>
        ))}

        {/* Enlace destacado hacia el directorio de cmaras de fotomultas de la ciudad */}
        <m.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-1 h-full">
          <Link
            href={`/multas/${ciudad.slug}/camaras`}
            className="group block h-full p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-black dark:from-white/10 dark:to-white/5 border border-slate-800 dark:border-white/10 hover:border-brand-500 transition-all shadow-lg"
          >
            <div className="inline-flex items-center justify-center p-3 bg-brand-500/20 rounded-xl mb-4">
              <MapPin className="text-brand-500" size={24} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 text-white">
              Directorio de Cmaras (ANSV)
            </h3>
            <p className="text-sm text-white/70 line-clamp-2">
              Verifica la ubicacin exacta de las cmaras de fotodeteccin autorizadas en{' '}
              {ciudad.nombre}.
            </p>
            <div className="mt-6 flex items-center gap-2 text-brand-500 text-sm font-bold">
              Explorar mapa{' '}
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
